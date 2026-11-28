// Manual end-to-end check against a live Stellic account with a real Duo push,
// no server or DB involved:
//
//   bun src/scripts/manual-login.ts <netid>
//
// It signs in and prints the current courses, restores the session from its
// serialized form, renews it through CAS as the worker does, and reads the
// courses again.

import { createInterface } from "node:readline/promises";
import { StellicLogin } from "../stellic/login.ts";
import { StellicSession } from "../stellic/session.ts";

export async function prompt(
  question: string,
  hidden = false,
): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (!hidden) {
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
  }
  // Minimal no-echo prompt for the password: after each key, redraw the line
  // as asterisks over what readline echoed.
  const redraw = (_char: string, key?: { name?: string }) => {
    // Enter submits; readline has already cleared its line by then, and a
    // redraw would print the question again.
    if (key?.name === "return" || key?.name === "enter") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const len = (rl as any).line.length;
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(question + "*".repeat(len));
  };
  // Keypress events come from stdin, which outlives this prompt: the listener
  // must be removed, or later prompts are overwritten with this question.
  process.stdin.on("keypress", redraw);
  process.stdout.write(question);
  try {
    return (await rl.question("")).trim();
  } finally {
    process.stdin.off("keypress", redraw);
    rl.close();
  }
}

function printCourses(
  courses: Awaited<ReturnType<StellicSession["currentCourses"]>>,
): void {
  if (!courses.length) {
    console.log(
      "\nSession authenticated, but no current-semester courses were found.",
    );
    return;
  }
  console.log(`\nCurrent semester courses (${courses.length}):`);
  for (const c of courses) {
    const units = typeof c.units === "number" ? String(c.units) : "-";
    console.log(
      `  ${(c.code ?? "?").padEnd(10)} ${units.padStart(4)} u  ${c.title ?? ""}`,
    );
  }
}

async function main(): Promise<void> {
  const netid = process.argv[2] ?? (await prompt("NetID: "));
  const password = await prompt("Password: ", true);
  const timeoutMs = Number(process.env.HTTP_TIMEOUT_MS ?? 30000);

  const login = new StellicLogin(netid, { timeoutMs });
  console.log("Signing in to CAS...");
  const challenge = await login.start(password);
  if (challenge.pushNeeded) {
    console.log(
      `Duo Push sent to ${challenge.device}.` +
        (challenge.verificationCode
          ? ` Verification code: ${challenge.verificationCode}`
          : ""),
    );
    await prompt("Approve it on your phone, then press Enter... ");
  } else {
    console.log("Duo remembered this device; no push needed.");
  }

  const { session } = await login.finish();
  console.log("Login OK. Session authenticated.");
  printCourses(await session.currentCourses());

  // Prove serialize -> seal-shaped round-trip keeps the session usable.
  const restored = StellicSession.fromSerialized(
    session.serialize(),
    timeoutMs,
  );
  const info = await restored.sessionInfo();
  console.log(
    `\nRestored session reports ${(info.remainingSeconds / 60).toFixed(1)} min left.`,
  );
  // The worker's renewal: a new session from CAS, no password or Duo.
  const expiresAt = await restored.reauthenticate();
  console.log(
    `Renewed through CAS; new session ends ${expiresAt.toLocaleTimeString()}.`,
  );
  printCourses(await restored.currentCourses());
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
