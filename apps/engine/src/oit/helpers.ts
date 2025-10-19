// src/oit/helpers.ts
// Author(s): Joshua Lau

import { OIT_Course, OIT_FullInstructor, OIT_Instructor, Status } from "./types";

export const getRegistrarToken = async () => {
  const response = await fetch("https://registrar.princeton.edu/course-offerings");
  const text = await response.text();
  return "Bearer " + text.split('apiToken":"')[1].split('"')[0];
};

/**
 * Resolve instructors from course data and course details
 * This is needed because the data from the OIT is ugly and has only the
 * netid in the course details, and only the first + last names in the course data
 * which are two different endpoints... thanks OIT :(
 *
 * @param courseInstructors Instructor info from courseData
 * @param detailInstructors Instructor info from courseDetails
 * @returns Resolved list of instructors with netids
 */
export const resolveInstructors = (
  courseInstructors: OIT_Instructor[],
  detailInstructors: { netid: string; name: string }[]
): OIT_FullInstructor[] => {
  const resolved: OIT_FullInstructor[] = [];

  for (const ci of courseInstructors) {
    const fullName = ci.full_name;
    const match = detailInstructors.find(
      (di) => di.name.trim().toLowerCase() === fullName.trim().toLowerCase()
    );

    if (match) {
      resolved.push({
        netid: match.netid,
        name: ci.first_name + " " + ci.last_name,
        full_name: ci.full_name,
      });
    } else {
      console.error(`Could not resolve instructor ${fullName} to a netid.`);
      console.error("Available detail instructors:", detailInstructors);
      console.error("Available course instructors:", courseInstructors);
    }
  }

  return resolved;
};

/**
 * Calculate overall course status based on section statuses
 * @param course Course data
 * @returns Overall course status
 */
export const calculateCourseStatus = (course: OIT_Course): Status => {
  const sections = course.classes;

  let allCanceled = true;
  const sectionMap: Record<string, boolean> = {};

  for (const section of sections) {
    const sectionStatus = section.status;
    const sectionType = section.type_name;

    if (sectionStatus !== "Canceled") allCanceled = false;
    if (sectionStatus === "Open") sectionMap[sectionType] = true;
    else if (!sectionMap[sectionType]) sectionMap[sectionType] = false;
  }

  if (allCanceled) return "canceled";
  else if (Object.values(sectionMap).every((x) => x)) return "open";
  else return "closed";
};

export const daysToValue = (days: string[]): number => {
  let value = 0;
  if (days.includes("M")) value += 1;
  if (days.includes("T")) value += 2;
  if (days.includes("W")) value += 4;
  if (days.includes("Th")) value += 8;
  if (days.includes("F")) value += 16;
  return value;
};

export const timeToValue = (time: string): number => {
  const TIME_CONVERSION: Record<string, number> = {
    ZERO_ADJUST: 48,
    HOUR_FACTOR: 6,
    MINUTE_FACTOR: 0.1,
    NULL_TIME: -420,
  };

  if (time === undefined) return TIME_CONVERSION.NULL_TIME;

  const dig = time
    .split(" ")[0]
    .split(":")
    .map((x) => parseInt(x));
  const pm = time.split(" ")[1] === "PM" || time.split(" ")[1] === "pm";

  if (dig[0] === 12) dig[0] = 0;

  let val =
    dig[0] * TIME_CONVERSION.HOUR_FACTOR +
    dig[1] * TIME_CONVERSION.MINUTE_FACTOR -
    TIME_CONVERSION.ZERO_ADJUST;

  if (pm) val += 12 * TIME_CONVERSION.HOUR_FACTOR;

  // Round to nearest tenth (account for floating point error)
  return Math.round(val * 10);
};
