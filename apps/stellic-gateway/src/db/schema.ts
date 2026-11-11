// Drizzle schema for the gateway. One row per connected student.

import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const connectionStatus = pgEnum("connection_status", [
  "active", // session is live and being kept alive
  "needs_reconnect", // CAS SSO lapsed; the student must sign in again
  "disconnected", // the student (or TigerJunction) revoked access
]);

export const connections = pgTable("connections", {
  netid: text("netid").primaryKey(),
  status: connectionStatus("status").notNull().default("active"),
  // Sealed StellicSession (encrypted cookie jar). Never stored in the clear.
  sealedSession: text("sealed_session").notNull(),
  // When the gateway ends this connection: 11 h after the password sign-in,
  // an hour before CAS stops renewing at 12 h. Renewals do not move it.
  casExpiresAt: timestamp("cas_expires_at", { withTimezone: true }),
  // When the current Stellic session ends: the SAML response's
  // SessionNotOnOrAfter (1 h after it was issued), or Stellic's idle timeout
  // if that comes first. The worker renews the session before this.
  stellicExpiresAt: timestamp("stellic_expires_at", { withTimezone: true }),
  lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
  // Worker renewals that failed in a row with a transient error. Reset by a
  // successful renewal or a new sign-in.
  refreshFailures: integer("refresh_failures").notNull().default(0),
  // After several failures in a row, the worker leaves the connection alone
  // until this time. Null means it is due whenever its session is.
  nextRefreshAt: timestamp("next_refresh_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
