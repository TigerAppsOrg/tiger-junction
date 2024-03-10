/**
 * Reformats the data in the prerequisite files according to the
 * style guidelines in the README. This script should be run FIRST
 * before any other steps in the compilation pipeline for safety.
 * Usage: node reformat.js
 */
import fs from 'fs';
import yaml from 'js-yaml';
import { TERM_MAP } from './shared.js';

export default function reformat() {
    console.log("Reformatting...")

    // Read each prerequisite file, reformatting the data
    const prereqFiles = fs.readdirSync("lib");
    fs.writeFileSync("log.txt", "");
    
    const PARAM_ORDER = [
        "course",
        "last",
        "travel",
        "iw",
        "notes",
        "equiv",
        "reqs",
    ];
        
    for (let i = 0; i < prereqFiles.length; i++) {
        const dir = "lib/" + prereqFiles[i];
        const files = fs.readdirSync(dir);
    
        for (let j = 0; j < files.length; j++) {
            const file = dir + "/" + files[j];
            const data = fs.readFileSync(file, "utf-8");
    
            // Handle front matter
            const frontMatter = data.split("---")[1];
            const frontMatterObj = yaml.load(frontMatter);
    
            // Verify that the front matter has the code parameter
            if (!frontMatterObj.hasOwnProperty("code")) {
                console.error(`Front matter missing code parameter in ${file}`);
                continue;
            }
    
            // Handle courses
            const courses = yaml.load(data.split("---")[2]);
            if (courses === undefined) continue;
    
            outer: for (let k = 0; k < courses.length; k++) {
                const course = courses[k];
                let isError = false;
                
                //----------------------------------------------------------
                // Verification
                //----------------------------------------------------------
    
                // Verify that the course has the course and last parameters
                if (!course.hasOwnProperty("course")) {
                    console.error(`Course missing course parameter in ${file}`);
                    isError = true;
                }
                if (!course.hasOwnProperty("last")) {
                    console.error(`Course missing last parameter in ${file}`);
                    isError = true;
                }
    
                // Ensure last is a valid term
                if (!TERM_MAP.hasOwnProperty(parseInt(course.last)) && course.last !== "SUMMER") {
                    console.error(`Invalid last term for course ${course.course}: ${course.last}`);
                    isError = true;
                }
    
                // Verify that the course has only valid parameters
                for (let l = 0; l < Object.keys(course).length; l++) {
                    const param = Object.keys(course)[l];
                    if (!PARAM_ORDER.includes(param)) {
                        console.error(`Invalid parameter for course ${course.course}: ${param}`);
                        isError = true;
                    }
                }
    
                // If equiv exists, ensure it is an array and sort
                if (course.hasOwnProperty("equiv")) {
                    if (!Array.isArray(course.equiv)) {
                        console.error(`Equiv parameter for course ${course.course} is not an array`);
                        isError = true;
                    }
                    course.equiv.sort();
                }
    
                if (isError) continue outer;
    
                //----------------------------------------------------------
                // Reformatting
                //----------------------------------------------------------
    
                // Ensure a space between dept/catnum in course
                const combTitle = course.course.replace(/\s/g,"")
                course.course = combTitle.slice(0, 3) + " " + combTitle.slice(3);
    
                // Remove 500-level courses
                if (course.course.split(" ")[1][0] === "5") {
                    courses.splice(k, 1);
                    k--;
                    continue;
                }
    
                // Remove multiple consecutive spaces and newlines if notes
                if (course.hasOwnProperty("notes")) {
                    course.notes = course.notes
                        .replace(/\s+/g, " ")
                        .replace(/\n/g, " ")
                        .trim();
                }
    
                // Put parameters in the correct order
                const newCourse = {};
                for (let l = 0; l < PARAM_ORDER.length; l++) {
                    const param = PARAM_ORDER[l];
                    if (course.hasOwnProperty(param)) {
                        newCourse[param] = course[param];
                    }
                }
                courses[k] = newCourse;
    
                fs.appendFileSync("log.txt", JSON.stringify(newCourse, null, 2));
            }
    
            // Sort courses by course
            courses.sort((a, b) => a.course.localeCompare(b.course));
    
            // Write to file
            const newFrontMatter = yaml.dump(frontMatterObj).trim();
            const newCourses = yaml.dump(courses).trim();
            fs.writeFileSync(file, "---\n" + newFrontMatter + "\n---\n" + newCourses);
        }
    }
}

if (process.argv[1].includes("reformat.js")) {
    reformat();
}