// Get course_id, primary listing, full title

import fs from 'fs';

const SUBJECT_CODE = 2;
const COURSE_ID = 4;
const CATALOG_NUMBER = 6;
const COURSE_TITLE = 7;

const raw = fs.readFileSync('f2024.csv', 'utf-8')
const courses = raw.split('\n').map(course => {
    const arr = course.split(',');

    const courseId = arr[COURSE_ID].trim();
    const primaryListing = arr[SUBJECT_CODE].trim() + " " + arr[CATALOG_NUMBER].trim();
    const fullTitle = arr.slice(COURSE_TITLE).join(',').trim().replace(/"/g, '');
    return {
        courseId,
        primaryListing,
        fullTitle
    }
});
courses.shift();

// Remove duplicate courseIds
const uniqueCourses = courses.filter((course, index, self) =>
    index === self.findIndex((t) => (
        t.courseId === course.courseId
    ))
);

fs.writeFileSync('courseIds.json', JSON.stringify(uniqueCourses, null, 2));

// console.log(courses);