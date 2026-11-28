// Background worker: a long-running loop that keeps stored sessions alive.
//
// Every tick (60 s) it asks the service to:
//   - end connections 11 h after the student's password sign-in, an hour
//     before CAS would stop renewing them (needs_reconnect: sign in again);
//   - replace every other session with a new one from CAS 5 min before it
//     ends. Each Stellic session ends 1 h after it was issued, and extending
//     it cannot move that, so a new one is fetched about every 55 min.
//     After 3 failed renewals in a row, a connection is retried after 5 min,
//     then 10, 20 and 30 min; if that last retry fails too, it is ended as
//     needs_reconnect.
//
// Run separately from the HTTP server: `bun run worker`.

import "dotenv/config";
import DB from "../db/index.ts";
import { ConnectionService } from "../service.ts";
import { loadSealKey } from "../crypto/seal.ts";

const TICK_MS = 60 * 1000;

async function main(): Promise<void> {
  const db = new DB();
  await db.testConnection();
  const service = new ConnectionService(
    db,
    loadSealKey(process.env.SESSION_SEAL_KEY),
    Number(process.env.HTTP_TIMEOUT_MS ?? 30000),
  );

  console.log("Stellic keep-alive worker started.");
  for (;;) {
    try {
      const { refreshed, needReconnect, failed } = await service.refreshDue();
      if (refreshed || needReconnect || failed.length) {
        console.log(
          `${new Date().toISOString()} refreshed ${refreshed}, needs-reconnect ${needReconnect}, failed ${failed.length}`,
        );
      }
      for (const { netid, error, failures, nextRefreshAt, closed } of failed) {
        const retry = closed
          ? "out of retries, ended as needs_reconnect"
          : nextRefreshAt
            ? `backing off until ${nextRefreshAt.toISOString()}`
            : "retrying next tick";
        console.error(
          `  ${netid} (${failures} in a row, ${retry}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } catch (err) {
      console.error(`${new Date().toISOString()} worker tick failed:`, err);
    }
    await sleep(TICK_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
