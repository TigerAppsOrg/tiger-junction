import OIT_API from "../../oit";

//----------------------------------------------------------------------

import util from "util";

// Override console.log to print objects with full depth
const originalLog = console.log;
console.log = function (...args) {
    const inspectedArgs = args.map(arg =>
        typeof arg === "object" && arg !== null
            ? util.inspect(arg, { depth: null, colors: true })
            : arg
    );
    originalLog(...inspectedArgs);
};

console.log("Updating evals in database");
const oit = new OIT_API();
const activeTerm = await oit.getLatestTermCode();
if (!activeTerm) throw new Error("Could not determine active term");
const courseIds = await oit.getCourseIds(activeTerm);
console.log(courseIds.length, "courses found.");

for (let i = 0; i < courseIds.length; i++) {
    if (i % 50 === 0)
        console.log(`Processing course ${i + 1} / ${courseIds.length}`);
    const courseId = courseIds[i];

    const evals = await oit.getCourseEvals(courseId);
    console.log(evals);

    if (i > 5) break;
}
