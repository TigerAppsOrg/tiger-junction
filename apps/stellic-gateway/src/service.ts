// The gateway's core logic, independent of HTTP. Routes and the worker both call
// into this. It owns the seal key, the in-memory pending logins, and the rules
// for keeping a stored session alive.

import { randomUUID } from "node:crypto";
import type DB from "./db/index.ts";
import type { Connection } from "./db/schema.ts";
import { seal, unseal } from "./crypto/seal.ts";
import {
  StellicLogin,
  type FinishedLogin,
  type PushChallenge,
} from "./stellic/login.ts";
import {
  StellicSession,
  type Course,
  type SerializedSession,
} from "./stellic/session.ts";
import {
  NeedsReconnectError,
  PushNotApprovedError,
  PushPendingError,
  StellicLoginError,
} from "./stellic/errors.ts";

// The worker replaces a Stellic session with a new one from CAS this long
// before it ends. Each session ends 1 h after it was issued, so with the 60 s
// worker tick a session is renewed every ~54-55 min and never runs out.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
// How long a connection lasts after the student's password sign-in. CAS stops
// renewing at 12 h; the gateway ends the connection an hour before that, so no
// read or refresh ever runs close to CAS's limit.
const CONNECTION_LIFETIME_MS = 11 * 60 * 60 * 1000;
// How long a started login waits for finish() before it is dropped. Duo pushes
// expire well before this.
const PENDING_TTL_MS = 5 * 60 * 1000;
// How long the background login waits for the student to approve the Duo push.
// Duo expires an unanswered push after about a minute, so this gives it time
// to do so. A client polling /connect/finish should keep polling for longer
// than this (2 min is a good limit), so it receives the final answer (410
// push_not_approved) instead of giving up first.
const PUSH_APPROVAL_TIMEOUT_MS = 90 * 1000;
// How long one finishConnect() call waits on the background login before
// answering "still pending". Duo's push-status request is a long poll that can
// stay open for many seconds, so finishConnect() never waits on Duo directly:
// each call returns within this bound, well inside the web app's 8 s timeout
// for gateway calls (and Lambda's 10 s cap), and callers poll until the login
// is done.
const FINISH_WAIT_MS = 5 * 1000;
// Sessions the worker renews at once. Each renewal is a few sequential requests
// to Stellic/CAS, so a little parallelism keeps a tick short without hammering them.
const REFRESH_CONCURRENCY = 5;
// After this many worker renewals fail in a row (network errors, unexpected
// answers from Stellic), stop retrying every tick and back off.
const BACKOFF_AFTER_FAILURES = 3;
// The waits after the 3rd, 4th, 5th and 6th failure in a row. Each is tried
// once; the failure after the last wait (the 7th in a row, about 67 min after
// the first) ends the connection as needs_reconnect. A session that lapses
// during a wait is fine: renewal goes through CAS either way, and reads renew
// a lapsed session.
const BACKOFF_SCHEDULE_MS = [5, 10, 20, 30].map((min) => min * 60 * 1000);

interface ConnectResult {
  netid: string;
}

/** A login waiting for the student to approve its Duo push. */
interface PendingLogin {
  netid: string;
  login: StellicLogin;
  expiresAt: number;
  /**
   * The rest of the login (push wait, Duo -> CAS -> Stellic, storing the
   * session), started by the first finishConnect() and shared by later ones.
   */
  result?: Promise<ConnectResult>;
}

export interface RefreshResult {
  refreshed: number;
  needReconnect: number;
  /**
   * Connections that hit a transient error. Retried on the next tick, or at
   * `nextRefreshAt` once `failures` in a row reach the backoff threshold.
   * Those out of retries are `closed`, and counted in needReconnect too.
   */
  failed: RefreshFailure[];
}

export interface RefreshFailure {
  netid: string;
  error: unknown;
  /** Failures in a row, counting this one. */
  failures: number;
  /** When the worker tries again; null means the next tick, or closed. */
  nextRefreshAt: Date | null;
  /** Out of retries: the connection was ended as needs_reconnect. */
  closed: boolean;
}

export class ConnectionService {
  private pending = new Map<string, PendingLogin>();

  constructor(
    private db: DB,
    private sealKey: Buffer,
    private timeoutMs: number,
    private finishWaitMs = FINISH_WAIT_MS,
  ) {}

  /** Phase 1: sign in to CAS and send the Duo push. Returns a token for finish(). */
  async startConnect(
    netid: string,
    password: string,
  ): Promise<{ connectionToken: string; challenge: PushChallenge }> {
    this.sweepPending();
    const login = new StellicLogin(netid, { timeoutMs: this.timeoutMs });
    const challenge = await login.start(password);
    const connectionToken = randomUUID();
    this.pending.set(connectionToken, {
      netid,
      login,
      expiresAt: Date.now() + PENDING_TTL_MS,
    });
    return { connectionToken, challenge };
  }

  /**
   * Phase 2: finish login once the push is approved and store the sealed
   * session. The first call starts that work in the background; every call
   * waits at most finishWaitMs for it, then throws PushPendingError so the
   * caller can poll again with the same token.
   */
  async finishConnect(
    connectionToken: string,
    netid: string,
  ): Promise<ConnectResult> {
    this.sweepPending();
    const entry = this.pending.get(connectionToken);
    // A token only finishes the login it was issued for.
    if (!entry || entry.netid !== netid) {
      throw new NotFoundError("Unknown or expired connection token");
    }
    if (!entry.result) {
      entry.result = this.completeLogin(entry);
      // Settling between polls, with no call waiting, is not an unhandled
      // rejection: the next poll picks the error up.
      entry.result.catch(() => {});
    }

    let outcome: ConnectResult | typeof STILL_PENDING;
    try {
      outcome = await settledWithin(entry.result, this.finishWaitMs);
    } catch (err) {
      this.pending.delete(connectionToken);
      throw err;
    }
    if (outcome === STILL_PENDING) throw new PushPendingError();
    this.pending.delete(connectionToken);
    return outcome;
  }

  /** Wait for the push, finish the redirects into Stellic, store the session. */
  private async completeLogin(entry: PendingLogin): Promise<ConnectResult> {
    let finished: FinishedLogin;
    try {
      finished = await entry.login.finish(PUSH_APPROVAL_TIMEOUT_MS);
    } catch (err) {
      // Here the full wait has run out, so it is a final answer, not "poll again".
      if (err instanceof PushPendingError) throw new PushNotApprovedError();
      throw err;
    }
    // Store the session straight away: any further request to Stellic could
    // fail and lose a login the student has already approved.
    const { session, expiresAt } = finished;
    const now = new Date();
    await this.db.upsertConnection({
      netid: entry.netid,
      status: "active",
      sealedSession: seal(this.sealKey, session.serialize()),
      // Counted from the password sign-in; renewals through CAS keep this value.
      casExpiresAt: new Date(now.getTime() + CONNECTION_LIFETIME_MS),
      stellicExpiresAt: expiresAt,
      lastRefreshedAt: now,
    });
    return { netid: entry.netid };
  }

  /**
   * Read the student's current courses from their stored session.
   *
   * The worker keeps every active session renewed, so the read normally just
   * works. If Stellic answers as if the session lapsed anyway (for example,
   * after the worker was down), it is renewed once and the read retried.
   */
  async currentCourses(netid: string): Promise<Course[]> {
    const row = await this.loadActive(netid);
    return this.markIfLapsed(row, async () => {
      const session = this.deserialize(row);
      try {
        return await session.currentCourses();
      } catch (err) {
        // A network failure says nothing about the session; only renew when
        // Stellic answered as if the session had lapsed. If the row changed
        // meanwhile, the renewal is not stored, but this session still works
        // for the retry.
        if (!(err instanceof StellicLoginError)) throw err;
        await this.renew(row, session);
        return session.currentCourses();
      }
    });
  }

  async disconnect(netid: string): Promise<void> {
    await this.db.disconnect(netid);
  }

  async status(
    netid: string,
  ): Promise<Pick<
    Connection,
    "netid" | "status" | "casExpiresAt" | "stellicExpiresAt" | "lastRefreshedAt"
  > | null> {
    const row = await this.db.getConnection(netid);
    if (!row) return null;
    return {
      netid: row.netid,
      status: row.status,
      casExpiresAt: row.casExpiresAt,
      stellicExpiresAt: row.stellicExpiresAt,
      lastRefreshedAt: row.lastRefreshedAt,
    };
  }

  /**
   * One worker pass. First ends every connection past its lifetime, then
   * renews every remaining active session near its end. A renewal CAS refuses
   * flips the connection to needs_reconnect. Any other failure is reported and
   * retried next tick, without holding up the remaining connections; after
   * BACKOFF_AFTER_FAILURES in a row, the retry waits (see backoffMs()), and
   * once the waits run out the connection is ended as needs_reconnect.
   *
   * A renewal whose row changed while it ran (the student signed in again or
   * disconnected) stores nothing and is not counted.
   */
  async refreshDue(now = new Date()): Promise<RefreshResult> {
    const expired = await this.db.expireConnections(now);
    const due = await this.db.dueForRefresh(
      new Date(now.getTime() + REFRESH_MARGIN_MS),
      now,
    );
    const result: RefreshResult = {
      refreshed: 0,
      needReconnect: expired,
      failed: [],
    };
    await forEachLimit(due, REFRESH_CONCURRENCY, async (row) => {
      try {
        const stored = await this.markIfLapsed(row, () =>
          this.renew(row, this.deserialize(row)),
        );
        if (stored) result.refreshed++;
      } catch (err) {
        if (err instanceof NeedsReconnectError) {
          result.needReconnect++;
          return;
        }
        const failures = row.refreshFailures + 1;
        const wait = backoffMs(failures);
        const closed = wait === null;
        const nextRefreshAt = wait ? new Date(now.getTime() + wait) : null;
        result.failed.push({
          netid: row.netid,
          error: err,
          failures,
          nextRefreshAt,
          closed,
        });
        if (closed) result.needReconnect++;
        try {
          // Both are skipped if the student signed in again meanwhile.
          if (closed) {
            await this.db.markNeedsReconnect(row.netid, row.sealedSession);
          } else {
            await this.db.recordRefreshFailure(row.netid, row.sealedSession, {
              refreshFailures: failures,
              nextRefreshAt,
            });
          }
        } catch {
          // The renewal error is already reported. If the database is down,
          // the next tick's queries fail loudly; this lane must not throw.
        }
      }
    });
    return result;
  }

  /**
   * Replace `row`'s Stellic session with a new one from CAS and store it.
   * Returns false if the row no longer holds the session renewed here, in
   * which case nothing is stored. Throws NeedsReconnectError once CAS wants
   * the student's password again.
   */
  private async renew(
    row: Connection,
    session: StellicSession,
  ): Promise<boolean> {
    const stellicExpiresAt = await session.reauthenticate();
    return this.db.saveRefreshedSession(row.netid, row.sealedSession, {
      sealedSession: seal(this.sealKey, session.serialize()),
      stellicExpiresAt,
      lastRefreshedAt: new Date(),
    });
  }

  /**
   * Run fn, flipping the connection to needs_reconnect if it reports CAS
   * lapsed, unless the row has since moved on from `row`'s session.
   */
  private async markIfLapsed<T>(
    row: Connection,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof NeedsReconnectError) {
        await this.db.markNeedsReconnect(row.netid, row.sealedSession);
      }
      throw err;
    }
  }

  private async loadActive(
    netid: string,
    now = new Date(),
  ): Promise<Connection> {
    const row = await this.db.getConnection(netid);
    if (!row || row.status === "disconnected") {
      throw new NotFoundError(`No active connection for ${netid}`);
    }
    if (row.status === "needs_reconnect") {
      throw new NeedsReconnectError(`${netid} must reconnect`);
    }
    // Past its lifetime but not yet ended by the worker: end it here, so no
    // request uses a connection the worker is about to end.
    if (row.casExpiresAt && row.casExpiresAt <= now) {
      await this.db.markNeedsReconnect(netid, row.sealedSession);
      throw new NeedsReconnectError(`${netid} must reconnect`);
    }
    return row;
  }

  private deserialize(row: Connection): StellicSession {
    let data: SerializedSession;
    try {
      data = unseal<SerializedSession>(this.sealKey, row.sealedSession);
    } catch {
      // Wrong key or corrupt blob: the stored session is unusable for good.
      throw new NeedsReconnectError(
        `Stored session for ${row.netid} could not be unsealed`,
      );
    }
    return StellicSession.fromSerialized(data, this.timeoutMs);
  }

  private sweepPending(now = Date.now()): void {
    for (const [token, entry] of this.pending) {
      if (entry.expiresAt <= now) this.pending.delete(token);
    }
  }
}

/**
 * How long the worker waits after `failures` renewals in a row have failed:
 * 0 for "next tick", or null once the retries have run out and the
 * connection should be ended.
 */
export function backoffMs(failures: number): number | null {
  if (failures < BACKOFF_AFTER_FAILURES) return 0;
  return BACKOFF_SCHEDULE_MS[failures - BACKOFF_AFTER_FAILURES] ?? null;
}

const STILL_PENDING = Symbol("still pending");

/** The promise's value if it settles within ms, else STILL_PENDING. Rejects if it does. */
async function settledWithin<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | typeof STILL_PENDING> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof STILL_PENDING>((resolve) => {
    timer = setTimeout(() => resolve(STILL_PENDING), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Run fn over items with at most `limit` calls in flight. fn must not throw. */
async function forEachLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lanes = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) await fn(items[next++]);
    },
  );
  await Promise.all(lanes);
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
