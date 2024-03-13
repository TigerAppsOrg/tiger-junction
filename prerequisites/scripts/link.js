/**
 * link.js
 * Usage: node link.js
 */

import fs from 'fs';
import yaml from 'js-yaml';

/**
 * Links the courses in the prerequisite files to their respective
 * course IDs. This script should be run after createResolve.js
 * to ensure that the cross table is up to date.
 * @returns {boolean} True if successful, false otherwise
 */
export default function link() {
    console.log("Linking...");

    const crossTable = JSON.parse(fs.readFileSync("../cache/resolve/cross_table.json", "utf-8"));

    const prereqFiles = fs.readdirSync("lib");
    for (let i = 0; i < prereqFiles.length; i++) {
        const dir = "lib/" + prereqFiles[i];
        const files = fs.readdirSync(dir);

        for (let j = 0; j < files.length; j++) {
            const file = dir + "/" + files[j];
            const data = fs.readFileSync(file, "utf-8");

            const frontMatter = yaml.load(data.split("---")[1]);
            const courses = yaml.load(data.split("---")[2]);

            cl: for (let k = 0; k < courses.length; k++) {
                if (!crossTable.hasOwnProperty(courses[k].course)) {
                    if (courses[k].course === "MAT    NFO2" 
                    || courses[k].course === "MAT    NFO1"
                    || courses[k].course === "MAT NFO1"
                    || courses[k].course === "MAT NFO2") {
                        continue cl;
                    }
                    console.error(`Course ${courses[k].course} not found in cross table`);
                    console.error(`File ${file}`)
                    console.error("Exiting link process");
                    return false;
                }

                courses[k].id = crossTable[courses[k].course].id;
            }

            fs.writeFileSync(file, "---\n" + yaml.dump(frontMatter) + "---\n" + yaml.dump(courses).trim());
        }
    }

    console.log("Linking complete");
    return true;
}

if (process.argv[1].includes("link.js")) {
    link();
}