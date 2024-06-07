/**
 * add.js
 * Usage: node add.js <term>
 */
import fs from "fs";
import yaml from "js-yaml";
import { TERM_MAP } from "./shared.js";

/**
 * Adds courses not manually added to the prerequisite files.
 * Automatically-added courses assume no prerequisites. Before calling this
 * function, ensure that the prerequisites files are up-to-date.
 * @param {number} term
 * @returns {boolean} True if successful, false otherwise
 */
export default function add(term) {
    if (!term) {
        console.error("Usage: node add.js <term>");
        return false;
    }

    if (!TERM_MAP.hasOwnProperty(parseInt(term))) {
        console.error("Invalid term");
        return false;
    }

    // Read courselist from cache
    const courselistCache = fs.readFileSync(
        "../cache/coursedata/sm/" + term + "_sm.json"
    );
    const courselist = [
        ...new Set(
            JSON.parse(courselistCache)
                .map(x => {
                    const title = x.subject + x.catnum;
                    if (title.split(" ")[1] === undefined) {
                        return title.slice(0, 3) + " " + title.slice(3);
                    }
                    return title;
                })
                .filter(x => x.split(" ")[1][0] !== "5")
        )
    ];

    // Read each prerequisite file, adding courses not already present
    const prereqFiles = fs.readdirSync("lib");
    for (let i = 0; i < prereqFiles.length; i++) {
        const dir = "lib/" + prereqFiles[i];
        const files = fs.readdirSync(dir);

        // Read each file
        for (let j = 0; j < files.length; j++) {
            const file = dir + "/" + files[j];
            const data = fs.readFileSync(file, "utf-8");

            // Handle front matter
            const frontMatter = data.split("---")[1];
            const frontMatterObj = yaml.load(frontMatter);
            frontMatterObj.updated = new Date().toLocaleDateString("en-US");

            let courses = yaml.load(data.split("---")[2]);
            const currentCourses =
                courses !== undefined ? courses.map(x => x.course) : [];
            const termCourselist = courselist
                .filter(x => x.split(" ")[0] === frontMatterObj.code)
                .filter(x => !currentCourses.includes(x));

            // Add courses not already present to the file
            if (courses === undefined) courses = [];
            courses.push(
                ...termCourselist.map(x => {
                    return {
                        course: x,
                        last: parseInt(term)
                    };
                })
            );
            courses = courses.sort((a, b) => a.course.localeCompare(b.course));

            // Write the file
            const frontMatterStr = yaml.dump(frontMatterObj);
            const coursesStr = yaml.dump(courses).trim();
            const newFile = "---\n" + frontMatterStr + "---\n" + coursesStr;
            fs.writeFileSync(file, newFile);
        }
    }
    return true;
}

if (process.argv[1].includes("add.js")) {
    const args = process.argv.slice(2);
    const term = args[0];
    add(term);
}
