/**
 * Reformats the data in the prerequisite files according to the
 * style guidelines in the README. This script should be run FIRST
 * before any other steps in the compilation pipeline for safety.
 * Usage: node reformat.js <term>
 */
import fs from 'fs';
import yaml from 'js-yaml';
import { TERM_MAP } from './shared.js';

// Get and verify term from command line arguments
const args = process.argv.slice(2);
const term = args[0];

if (!term) {
    console.error('Usage: node reformat.js <term>');
    process.exit(1);
}

if (!TERM_MAP.hasOwnProperty(parseInt(term))) {
    console.error('Invalid term');
    process.exit(1);
}

// Read each prerequisite file, reformatting the data
const prereqFiles = fs.readdirSync("lib");

for (let i = 0; i < prereqFiles.length; i++) {
    const dir = "lib/" + prereqFiles[i];
    const files = fs.readdirSync(dir);

    for (let j = 0; j < files.length; j++) {
        const file = dir + "/" + files[j];
        const data = fs.readFileSync(file, "utf-8");

        // Handle front matter
        const frontMatter = data.split("---")[1];
        const frontMatterObj = yaml.load(frontMatter);
        frontMatterObj.updated = new Date().toLocaleDateString("en-US");

        // Handle courses
        const courses = yaml.load(data.split("---")[2]);
        if (courses === undefined) continue;

        fs.appendFileSync("log.txt", JSON.stringify(courses, null, 2));



    }
}