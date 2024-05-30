import fs from "fs";

const getToken = async () => {
    let response = await fetch("https://registrar.princeton.edu/course-offerings");
    let text = await response.text();
    return "Bearer " + text.split("apiToken\":\"")[1].split("\"")[0];
}

const TERM_URL = 'https://api.princeton.edu/registrar/course-offerings/classes/';

const TERM_MAP = {
    1244: {
        "name": "Spring 2024",
        "mobile_name": "S24"
    },
    1242: {
        "name": "Fall 2023",
        "mobile_name": "F23"
    },
    1234: {
        "name": "Spring 2023",
        "mobile_name": "S23"
    },
    1232: {
        "name": "Fall 2022",
        "mobile_name": "F22"
    },
    1224: {
        "name": "Spring 2022",
        "mobile_name": "S22"
    },
    1222: {
        "name": "Fall 2021",
        "mobile_name": "F21"
    },
    1214: {
        "name": "Spring 2021",
        "mobile_name": "S21"
    },
    1212: {
        "name": "Fall 2020",
        "mobile_name": "F20"
    },
    1204: {
        "name": "Spring 2020",
        "mobile_name": "S20"
    },
    1202: {
        "name": "Fall 2019",
        "mobile_name": "F19"
    },
    1194: {
        "name": "Spring 2019",
        "mobile_name": "S19"
    },
    1192: {
        "name": "Fall 2018",
        "mobile_name": "F18"
    },
}


const API_URL = "https://api.princeton.edu/registrar/course-offerings/1.0.4/course-details?term=";

const args = process.argv.slice(2);
const term = args[0];

if (!term || !TERM_MAP.hasOwnProperty(parseInt(term))) {
    console.error("Invalid term");
    process.exit(1);
}

const startTime = new Date().getTime();

const token = await getToken();
const rawCourselist = await fetch(`${TERM_URL}${term}`, {
    method: "GET",
    headers: {
        "Authorization": token
    }
});

if (!rawCourselist.ok) {
    console.error("Failed to fetch course list");
    process.exit(1);
}

const jsonCourseList = await rawCourselist.json();
const courselist = jsonCourseList.classes.class.map(((/** @type any */ x) => {
    return {
        listing_id: x.course_id,
        code: x.crosslistings.replace(/\s/g, "")
    }
}));

const cacheData = [];
const responseTimes = [];
for (let i = 0; i < courselist.length; i++) {
    console.log(`Fetching course ${i + 1} of ${courselist.length}`)
    const course = courselist[i];

    const startRes = new Date().getTime();
    const rawCourseData = await fetch(`${API_URL}${term}&course_id=${course.listing_id}`, {
        method: "GET",
        headers: {
            "Authorization": token
            }
        }
    );
    const endRes = new Date().getTime();
    responseTimes.push(endRes - startRes);

    if (!rawCourseData.ok) {
        console.error(`Failed to fetch course data for ${course}`);
        continue;
    }

    const courseData = (await rawCourseData.json()).course_details.course_detail[0];
    cacheData.push(courseData);

    const timeout = Math.random() * 1000 + 500;
    await new Promise(resolve => setTimeout(resolve, timeout));
}

const filename = "coursedata/" + term + ".json";
fs.writeFileSync(filename, JSON.stringify(cacheData, null, 4));

console.log(`Average response time: ${responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length}ms`);
const endTime = new Date().getTime();
console.log(`Wrote ${cacheData.length} courses to ${filename} in ${(endTime - startTime) / 1000}s.`);