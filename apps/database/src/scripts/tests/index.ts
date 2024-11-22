import { fetchTests } from "./fetchTests";
import { updateTests } from "./updateTests";

type Tests = {
    [unit: string]: {
        [testName: string]: () => Promise<boolean>;
    };
};

// Register new units here (make sure to import them)
const tests: Tests = {
    "Fetch Tests": fetchTests,
    "Update Tests": updateTests
};

const runTests = async (tests: Tests) => {
    let numPassed = 0;
    let numFailed = 0;

    const startTime = Date.now();

    console.log("Running tests...\n");
    for (const [unit, testObj] of Object.entries(tests)) {
        console.log("\x1b[1m%s\x1b[0m", `Running tests for unit "${unit}"`);

        for (const [testName, testFunc] of Object.entries(testObj)) {
            const res = await testFunc();
            if (res) {
                console.log("\x1b[34m%s\x1b[0m", `Test "${testName}" passed`);
                numPassed++;
            } else {
                console.error(`Test "${testName}" failed`);
                numFailed++;
            }
        }

        console.log("--------------------------------\n");
    }

    const elapsedSecs = (Date.now() - startTime) / 1000;

    console.log(
        "\x1b[1m%s\x1b[0m",
        `Tests complete in ${elapsedSecs}s: ${numPassed} passed, ${numFailed} failed`
    );
};

await runTests(tests);
