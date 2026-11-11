import { describe, test, expect } from "bun:test";
import { randomBytes } from "node:crypto";
import type DB from "../db/index.ts";
import type { Connection } from "../db/schema.ts";
import { ConnectionService, NotFoundError, backoffMs } from "../service.ts";
import { HttpError } from "../stellic/http.ts";
import {
  NeedsReconnectError,
  PushNotApprovedError,
  PushPendingError,
  StellicLoginError,
} from "../stellic/errors.ts";

// An in-memory DB covering the methods the service calls. Guarded writes match
// the real ones: they apply only while the row is active and still holds the
// session the caller started from. `marked` and `saved` list applied writes.
function fakeDb(rows: Connection[]) {
  const marked: string[] = [];
  const stored: string[] = [];
  const saved: { netid: string; stellicExpiresAt: Date | null }[] = [];
  const unchanged = (netid: string, fromSession: string) =>
    rows.find(
      (r) =>
        r.netid === netid &&
        r.status === "active" &&
        r.sealedSession === fromSession,
    );
  const db = {
    async getConnection(netid: string) {
      return rows.find((r) => r.netid === netid);
    },
    async expireConnections(now: Date) {
      let n = 0;
      for (const r of rows) {
        if (r.status === "active" && r.casExpiresAt && r.casExpiresAt <= now) {
          r.status = "needs_reconnect";
          n++;
        }
      }
      return n;
    },
    async dueForRefresh(_before: Date, now: Date) {
      return rows
        .filter(
          (r) =>
            r.status === "active" &&
            (!r.nextRefreshAt || r.nextRefreshAt <= now),
        )
        .map((r) => ({ ...r }));
    },
    async markNeedsReconnect(netid: string, fromSession: string) {
      const r = unchanged(netid, fromSession);
      if (!r) return;
      r.status = "needs_reconnect";
      r.sealedSession = "";
      marked.push(netid);
    },
    async upsertConnection(row: { netid: string }) {
      stored.push(row.netid);
    },
    async saveRefreshedSession(
      netid: string,
      fromSession: string,
      fields: { sealedSession: string; stellicExpiresAt: Date | null },
    ) {
      const r = unchanged(netid, fromSession);
      if (!r) return false;
      Object.assign(r, fields, { refreshFailures: 0, nextRefreshAt: null });
      saved.push({ netid, stellicExpiresAt: fields.stellicExpiresAt });
      return true;
    },
    async recordRefreshFailure(
      netid: string,
      fromSession: string,
      fields: { refreshFailures: number; nextRefreshAt: Date | null },
    ) {
      const r = unchanged(netid, fromSession);
      if (r) Object.assign(r, fields);
    },
  };
  return { db: db as unknown as DB, marked, stored, saved };
}

function row(netid: string, overrides: Partial<Connection> = {}): Connection {
  const now = new Date();
  return {
    netid,
    status: "active",
    sealedSession: "not-a-valid-sealed-blob",
    casExpiresAt: null,
    stellicExpiresAt: null,
    lastRefreshedAt: null,
    refreshFailures: 0,
    nextRefreshAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("ConnectionService", () => {
  test("an unreadable stored session is flagged for reconnect, without stopping the tick", async () => {
    const { db, marked } = fakeDb([row("a"), row("b")]);
    const service = new ConnectionService(db, randomBytes(32), 1000);
    const result = await service.refreshDue();
    expect(result).toEqual({ refreshed: 0, needReconnect: 2, failed: [] });
    expect(marked).toEqual(["a", "b"]);
  });

  test("reads against a needs_reconnect connection fail fast", async () => {
    const { db, marked } = fakeDb([row("a", { status: "needs_reconnect" })]);
    const service = new ConnectionService(db, randomBytes(32), 1000);
    await expect(service.currentCourses("a")).rejects.toBeInstanceOf(
      NeedsReconnectError,
    );
    expect(marked).toEqual([]);
  });

  test("a connection past its 11 h lifetime is ended by the worker, not renewed", async () => {
    const past = new Date(Date.now() - 1000);
    const { db, saved } = fakeDb([row("a", { casExpiresAt: past })]);
    const service = new ConnectionService(db, randomBytes(32), 1000);
    const result = await service.refreshDue();
    expect(result).toEqual({ refreshed: 0, needReconnect: 1, failed: [] });
    expect(saved).toEqual([]);
  });

  test("a read past the lifetime fails as needs_reconnect, even before the worker ends it", async () => {
    const past = new Date(Date.now() - 1000);
    const { db, marked } = fakeDb([row("a", { casExpiresAt: past })]);
    const service = new ConnectionService(db, randomBytes(32), 1000);
    await expect(service.currentCourses("a")).rejects.toBeInstanceOf(
      NeedsReconnectError,
    );
    expect(marked).toEqual(["a"]);
  });

  test("the worker renews through CAS and stores the new session's end time", async () => {
    const future = new Date(Date.now() + 3600_000);
    const { db, saved } = fakeDb([row("a", { casExpiresAt: future })]);
    const service = new ConnectionService(db, randomBytes(32), 1000);
    const newEnd = new Date(Date.now() + 3600_000);
    let reauths = 0;
    const session = {
      async reauthenticate() {
        reauths++;
        return newEnd;
      },
      serialize() {
        return { jar: {} };
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).deserialize = () => session;
    const result = await service.refreshDue();
    expect(result).toEqual({ refreshed: 1, needReconnect: 0, failed: [] });
    expect(reauths).toBe(1);
    expect(saved).toEqual([{ netid: "a", stellicExpiresAt: newEnd }]);
  });

  // A stand-in for the stored session. `reauthenticate` is what the worker's
  // renewal does over the network; tests make it succeed, fail, or change the
  // row while it runs.
  function stubSession(
    service: ConnectionService,
    reauthenticate: () => Promise<Date>,
  ) {
    let calls = 0;
    const session = {
      async reauthenticate() {
        calls++;
        return reauthenticate();
      },
      serialize() {
        return { jar: {} };
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).deserialize = () => session;
    return { calls: () => calls };
  }

  const inAnHour = () => new Date(Date.now() + 3600_000);

  test("a renewal does not overwrite a sign-in stored while it ran", async () => {
    const rows = [row("a", { casExpiresAt: inAnHour() })];
    const { db, saved } = fakeDb(rows);
    const service = new ConnectionService(db, randomBytes(32), 1000);
    stubSession(service, async () => {
      // The student re-links mid-renewal: a new session is stored.
      rows[0].sealedSession = "new-login";
      return inAnHour();
    });

    const result = await service.refreshDue();

    expect(result).toEqual({ refreshed: 0, needReconnect: 0, failed: [] });
    expect(saved).toEqual([]);
    expect(rows[0].sealedSession).toBe("new-login");
  });

  test("a renewal CAS refuses does not end a sign-in stored while it ran", async () => {
    const rows = [row("a", { casExpiresAt: inAnHour() })];
    const { db, marked } = fakeDb(rows);
    const service = new ConnectionService(db, randomBytes(32), 1000);
    stubSession(service, async () => {
      rows[0].sealedSession = "new-login";
      throw new NeedsReconnectError();
    });

    await service.refreshDue();

    expect(marked).toEqual([]);
    expect(rows[0].status).toBe("active");
    expect(rows[0].sealedSession).toBe("new-login");
  });

  test("a failure on a replaced session does not count against the new sign-in", async () => {
    const rows = [row("a", { casExpiresAt: inAnHour() })];
    const { db } = fakeDb(rows);
    const service = new ConnectionService(db, randomBytes(32), 1000);
    stubSession(service, async () => {
      rows[0].sealedSession = "new-login";
      throw new HttpError(0, "https://stellic.princeton.edu/", "network error");
    });

    await service.refreshDue();

    expect(rows[0].refreshFailures).toBe(0);
  });

  // A renewal that keeps failing with a transient error.
  function failingConnection(netid = "a") {
    const rows = [
      row(netid, { casExpiresAt: new Date(Date.now() + 86400_000) }),
    ];
    const fake = fakeDb(rows);
    const service = new ConnectionService(fake.db, randomBytes(32), 1000);
    const state = { failing: true };
    const session = stubSession(service, async () => {
      if (state.failing) {
        throw new HttpError(0, "https://stellic.princeton.edu/", "down");
      }
      return inAnHour();
    });
    return { rows, ...fake, service, state, session };
  }

  const MIN = 60_000;

  test("the worker backs off after 3 failed renewals in a row, and a success resets it", async () => {
    const { rows, service, state, session } = failingConnection();
    const t0 = Date.now();
    const at = (ms: number) => new Date(t0 + ms);

    // Failures 1 and 2: retried on the next tick.
    for (const n of [1, 2]) {
      const { failed } = await service.refreshDue(at(0));
      expect(failed).toMatchObject([
        { failures: n, nextRefreshAt: null, closed: false },
      ]);
    }
    // Failure 3: wait 5 min.
    let { failed } = await service.refreshDue(at(0));
    expect(failed).toMatchObject([
      { failures: 3, nextRefreshAt: at(5 * MIN), closed: false },
    ]);
    expect(session.calls()).toBe(3);

    // Not retried while backing off.
    await service.refreshDue(at(5 * MIN - 1));
    expect(session.calls()).toBe(3);

    // Retried once the wait ends; failure 4 waits 10 min.
    ({ failed } = await service.refreshDue(at(5 * MIN)));
    expect(failed).toMatchObject([
      { failures: 4, nextRefreshAt: at(15 * MIN), closed: false },
    ]);
    expect(session.calls()).toBe(4);

    // A success clears the count and the wait.
    state.failing = false;
    const result = await service.refreshDue(at(15 * MIN));
    expect(result.refreshed).toBe(1);
    expect(rows[0].refreshFailures).toBe(0);
    expect(rows[0].nextRefreshAt).toBeNull();
  });

  test("after one retry at the 30 min wait, the next failure ends the connection", async () => {
    const { rows, marked, service } = failingConnection();
    const t0 = Date.now();
    let t = 0;
    const tick = () => service.refreshDue(new Date(t0 + t));

    // Failures 1-3 back to back, then one retry after each wait.
    const waits: (number | null)[] = [];
    for (let i = 0; i < 6; i++) {
      const { failed } = await tick();
      const next = failed[0].nextRefreshAt;
      waits.push(next ? (next.getTime() - (t0 + t)) / MIN : null);
      if (next) t = next.getTime() - t0;
    }
    expect(waits).toEqual([null, null, 5, 10, 20, 30]);
    expect(rows[0].status).toBe("active");

    // The retry after the 30 min wait fails too: the connection is ended.
    const result = await tick();
    expect(result.failed).toMatchObject([
      { failures: 7, nextRefreshAt: null, closed: true },
    ]);
    expect(result.needReconnect).toBe(1);
    expect(marked).toEqual(["a"]);
    expect(rows[0].status).toBe("needs_reconnect");
    expect(rows[0].sealedSession).toBe("");
  });

  test("running out of retries does not end a sign-in stored meanwhile", async () => {
    const { rows, marked, service } = failingConnection();
    rows[0].refreshFailures = 6;
    const stub = stubSession(service, async () => {
      rows[0].sealedSession = "new-login";
      throw new HttpError(0, "https://stellic.princeton.edu/", "down");
    });

    await service.refreshDue();

    expect(stub.calls()).toBe(1);
    expect(marked).toEqual([]);
    expect(rows[0].status).toBe("active");
  });

  test("backoff schedule: next tick twice, then 5, 10, 20, 30 min, then close", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((n) => backoffMs(n))).toEqual([
      0,
      0,
      5 * MIN,
      10 * MIN,
      20 * MIN,
      30 * MIN,
      null,
      null,
    ]);
  });

  test("reads against a disconnected connection are not found", async () => {
    const { db } = fakeDb([row("a", { status: "disconnected" })]);
    const service = new ConnectionService(db, randomBytes(32), 1000);
    await expect(service.currentCourses("a")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  // Seeds a pending login whose finish() stays open until the test settles it,
  // like a Duo push the student has not answered yet.
  function withPendingLogin(service: ConnectionService, netid: string) {
    let calls = 0;
    let approve!: () => void;
    let fail!: (err: Error) => void;
    // Only serialize(): the service must store the session without making
    // any further request to Stellic.
    const session = {
      serialize() {
        return { jar: {} };
      },
    };
    const expiresAt = new Date(Date.now() + 3600_000);
    const login = {
      finish() {
        calls++;
        return new Promise((resolve, reject) => {
          approve = () => resolve({ session, expiresAt });
          fail = reject;
        });
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).pending.set("tok", {
      netid,
      login,
      expiresAt: Date.now() + 60_000,
    });
    return {
      calls: () => calls,
      approve: () => approve(),
      fail: (e: Error) => fail(e),
    };
  }

  // A short finish wait so polls answer "pending" quickly in tests.
  const FINISH_WAIT_MS = 20;

  test("polls answer pending while the push is open, then finish once it is approved", async () => {
    const { db, stored } = fakeDb([]);
    const service = new ConnectionService(
      db,
      randomBytes(32),
      1000,
      FINISH_WAIT_MS,
    );
    const login = withPendingLogin(service, "a");

    await expect(service.finishConnect("tok", "a")).rejects.toBeInstanceOf(
      PushPendingError,
    );
    await expect(service.finishConnect("tok", "a")).rejects.toBeInstanceOf(
      PushPendingError,
    );
    login.approve();
    const result = await service.finishConnect("tok", "a");

    expect(result).toEqual({ netid: "a" });
    expect(stored).toEqual(["a"]);
    // Every poll shares one background login rather than starting its own.
    expect(login.calls()).toBe(1);
    // The token is used up once the login is done.
    await expect(service.finishConnect("tok", "a")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test("a failure between polls is reported by the next poll", async () => {
    const { db } = fakeDb([]);
    const service = new ConnectionService(
      db,
      randomBytes(32),
      1000,
      FINISH_WAIT_MS,
    );
    const login = withPendingLogin(service, "a");

    await expect(service.finishConnect("tok", "a")).rejects.toBeInstanceOf(
      PushPendingError,
    );
    login.fail(new StellicLoginError("Duo Push failed: denied"));
    await Bun.sleep(0);
    await expect(service.finishConnect("tok", "a")).rejects.toThrow(
      "Duo Push failed: denied",
    );
    await expect(service.finishConnect("tok", "a")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test("running out of time on the push is a final failure, not pending", async () => {
    const { db } = fakeDb([]);
    const service = new ConnectionService(
      db,
      randomBytes(32),
      1000,
      FINISH_WAIT_MS,
    );
    const login = withPendingLogin(service, "a");

    await expect(service.finishConnect("tok", "a")).rejects.toBeInstanceOf(
      PushPendingError,
    );
    login.fail(new PushPendingError());
    const err = await service.finishConnect("tok", "a").catch((e) => e);
    expect(err).toBeInstanceOf(PushNotApprovedError);
    expect(err).not.toBeInstanceOf(PushPendingError);
  });

  test("a token cannot finish another student's login", async () => {
    const { db } = fakeDb([]);
    const service = new ConnectionService(db, randomBytes(32), 1000);
    const login = withPendingLogin(service, "a");
    await expect(service.finishConnect("tok", "b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(login.calls()).toBe(0);
  });
});
