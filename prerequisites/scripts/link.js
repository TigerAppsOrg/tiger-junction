/**
 * link.js
 * Usage: node link.js
 */

import fs from 'fs';
import yaml from 'js-yaml';

/**
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

            for (let k = 0; k < courses.length; k++) {
                if (!crossTable.hasOwnProperty(courses[k].course)) {
                    console.error(`Course ${courses[k].course} not found in cross table`);
                    process.exit(1);
                }

                courses[k].id = crossTable[courses[k].course].id;
            }

            fs.writeFileSync(file, "---\n" + yaml.dump(frontMatter) + "---\n" + yaml.dump(courses).trim());
        }
    }
}

if (process.argv[1].includes("link.js")) {
    link();
}