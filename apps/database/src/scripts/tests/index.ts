import { fetchTests } from "./fetchTests";
import { updateTests } from "./updateTests";

type Tests = {
    [unit: string]: {
        [testName: string]: () => Promise<boolean>;
    };
};

// Register new units here (make sure to import them)
const tests: Tests = {
    fetch: fetchTests,
    update: updateTests
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

//----------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--list") {
    console.log("Available tests:");
    for (const unit of Object.keys(tests)) {
        console.log(`- ${unit}`);
    }
    process.exit(0);
}

if (args.length === 2 && args[0] === "--run") {
    const unit = args[1];
    if (!tests[unit]) {
        console.error(`Unit "${unit}" not found`);
        process.exit(1);
    }

    await runTests({ [unit]: tests[unit] });
    process.exit(0);
} else {
    await runTests(tests);
}
