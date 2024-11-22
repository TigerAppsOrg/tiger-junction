import { Status } from "./db-types";
import { RegDeptCourse } from "./reg-types";

export const formatCourseStatus = (course: RegDeptCourse): Status => {
    const sections = course.classes;

    let allCanceled = true;
    const sectionMap: Record<string, boolean> = {};

    for (const section of sections) {
        const sectionStatus = section.pu_calc_status;
        const sectionType = section.type_name;

        if (sectionStatus !== "Canceled") allCanceled = false;
        if (sectionStatus === "Open") sectionMap[sectionType] = true;
        else if (!sectionMap[sectionType]) sectionMap[sectionType] = false;
    }

    if (allCanceled) return "cancelled";
    else if (Object.values(sectionMap).every(x => x)) return "open";
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
        NULL_TIME: -42
    };

    if (time === undefined) return TIME_CONVERSION.NULL_TIME;

    const dig = time
        .split(" ")[0]
        .split(":")
        .map(x => parseInt(x));
    const pm = time.split(" ")[1] === "PM" || time.split(" ")[1] === "pm";

    if (dig[0] === 12) dig[0] = 0;

    let val =
        dig[0] * TIME_CONVERSION.HOUR_FACTOR +
        dig[1] * TIME_CONVERSION.MINUTE_FACTOR -
        TIME_CONVERSION.ZERO_ADJUST;

    if (pm) val += 12 * TIME_CONVERSION.HOUR_FACTOR;

    // Round to nearest tenth (account for floating point error)
    return Math.round(val * 10) / 10;
};
