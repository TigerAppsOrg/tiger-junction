import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const fixture = fileURLToPath(new URL("./fixtures/import-preload.ts", import.meta.url));
const cli = fileURLToPath(new URL("../index.ts", import.meta.url));

async function runImport(failStep: number) {
    const child = Bun.spawn([process.execPath, "--preload", fixture, cli, "1274", "--grading"], {
        env: { ...process.env, FAIL_STEP: String(failStep) },
        stdout: "pipe", stderr: "pipe"
    });
    const [exitCode, stdout, stderr] = await Promise.all([
        child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()
    ]);
    return { exitCode, stdout, stderr };
}

const operations = [
    "fetch existing listings", "upsert listings", "fetch existing courses",
    "upsert existing courses", "insert new courses", "fetch existing sections",
    "upsert existing sections", "insert new sections", "delete obsolete sections"
];

for (const [index, operation] of operations.entries()) {
    test(`CLI fails before Redis sync when it cannot ${operation}`, async () => {
        const result = await runImport(index + 1);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain(`Failed to ${operation} for term 1274`);
        expect(result.stdout).not.toContain("REDIS_SYNC_REACHED");
        expect(result.stdout).not.toContain(`DB_STEP=${index + 2}`);
        expect(result.stdout).not.toContain("Finished in");
    });
}

test("CLI syncs Redis and succeeds after all import operations succeed", async () => {
    const result = await runImport(0);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("DB_STEP=9");
    expect(result.stdout).toContain("REDIS_SYNC_REACHED");
    expect(result.stdout).toContain("Finished in");
});
