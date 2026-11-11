// Data access for connections. Thin wrapper over Drizzle, mirroring the engine's
// DB class shape (a class with a `db` handle and typed methods).

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, isNull, lt, lte, or, sql } from "drizzle-orm";
import * as schema from "./schema.ts";
import type { Connection, NewConnection } from "./schema.ts";

const { connections } = schema;

// What markNeedsReconnect and expireConnections write: the student must sign in again.
function ended() {
  return {
    status: "needs_reconnect" as const,
    sealedSession: "",
    stellicExpiresAt: null,
    updatedAt: new Date(),
  };
}

/**
 * The row is still active and still holds `fromSession`, the sealed session an
 * operation started from. Renewals and failure checks run for seconds against
 * CAS and Stellic; if the student signed in again (or disconnected) meanwhile,
 * their result describes a session that is no longer stored and must not
 * overwrite the row. Each seal uses a fresh random IV, so the sealed blob
 * names exactly one stored session.
 */
function unchanged(netid: string, fromSession: string) {
  return and(
    eq(connections.netid, netid),
    eq(connections.status, "active"),
    eq(connections.sealedSession, fromSession),
  );
}

export default class DB {
  public readonly db: NodePgDatabase<typeof schema>;

  constructor() {
    if (!process.env.POSTGRES_URL) {
      throw new Error("POSTGRES_URL environment variable is not set.");
    }
    this.db = drizzle(process.env.POSTGRES_URL, { schema });
  }

  async testConnection(): Promise<void> {
    await this.db.execute(sql`SELECT 1`);
  }

  /** Insert or fully replace a connection; used when a student (re)connects. */
  async upsertConnection(row: NewConnection): Promise<void> {
    await this.db
      .insert(connections)
      .values(row)
      .onConflictDoUpdate({
        target: connections.netid,
        set: {
          status: row.status ?? "active",
          sealedSession: row.sealedSession,
          casExpiresAt: row.casExpiresAt,
          stellicExpiresAt: row.stellicExpiresAt,
          lastRefreshedAt: row.lastRefreshedAt,
          refreshFailures: 0,
          nextRefreshAt: null,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Store a renewed session and clear any failure backoff. Returns false, and
   * writes nothing, if the row no longer holds `fromSession` (see unchanged()).
   */
  async saveRefreshedSession(
    netid: string,
    fromSession: string,
    fields: Pick<
      Connection,
      "sealedSession" | "stellicExpiresAt" | "lastRefreshedAt"
    >,
  ): Promise<boolean> {
    const rows = await this.db
      .update(connections)
      .set({
        ...fields,
        refreshFailures: 0,
        nextRefreshAt: null,
        updatedAt: new Date(),
      })
      .where(unchanged(netid, fromSession))
      .returning({ netid: connections.netid });
    return rows.length > 0;
  }

  /**
   * Record a failed worker renewal: the new failure count, and when to try
   * again if the worker is backing off. Skipped if the row no longer holds
   * `fromSession`, so a failure never counts against a newer sign-in.
   */
  async recordRefreshFailure(
    netid: string,
    fromSession: string,
    fields: Pick<Connection, "refreshFailures" | "nextRefreshAt">,
  ): Promise<void> {
    await this.db
      .update(connections)
      .set({ ...fields, updatedAt: new Date() })
      .where(unchanged(netid, fromSession));
  }

  async getConnection(netid: string): Promise<Connection | undefined> {
    return this.db.query.connections.findFirst({
      where: eq(connections.netid, netid),
    });
  }

  /**
   * Active connections whose Stellic window expires before `before`, or whose
   * expiry is unknown, and which are not backing off at `now`. These are the
   * ones the worker needs to refresh this tick.
   */
  async dueForRefresh(before: Date, now: Date): Promise<Connection[]> {
    return this.db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.status, "active"),
          or(
            isNull(connections.stellicExpiresAt),
            lt(connections.stellicExpiresAt, before),
          ),
          or(
            isNull(connections.nextRefreshAt),
            lte(connections.nextRefreshAt, now),
          ),
        ),
      );
  }

  /**
   * Flip a connection to needs_reconnect and drop its stored session. Nothing
   * reads a needs_reconnect session again, and until CAS's own limit it still
   * works as a Princeton sign-in, so it is not kept.
   *
   * Only if the row still holds `fromSession`, the session found to be dead: a
   * newer sign-in stored in the meantime is a different session and stays.
   */
  async markNeedsReconnect(netid: string, fromSession: string): Promise<void> {
    await this.db
      .update(connections)
      .set(ended())
      .where(unchanged(netid, fromSession));
  }

  /** End every active connection whose lifetime ran out by `now`; returns how many. */
  async expireConnections(now: Date): Promise<number> {
    const rows = await this.db
      .update(connections)
      .set(ended())
      .where(
        and(
          eq(connections.status, "active"),
          lte(connections.casExpiresAt, now),
        ),
      )
      .returning({ netid: connections.netid });
    return rows.length;
  }

  /** Revoke a connection and drop its stored session, which is a live login. */
  async disconnect(netid: string): Promise<void> {
    await this.db
      .update(connections)
      .set({
        status: "disconnected",
        sealedSession: "",
        stellicExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(connections.netid, netid));
  }
}
