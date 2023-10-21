// Functions for handling iCal (.ics file) creation
import { valueToDays } from "../convert";

/**
 * Converts a value to an RRule
 * @param value 
 * @param until 
 * @returns RRule string
 */
export const valueToRRule = (value: number, until: number[]) => {
    let days = valueToDays(value);
    let rrule = "FREQ=WEEKLY;BYDAY=";
    for (let day of days) {
        if (day === 1) rrule += "MO,";
        if (day === 2) rrule += "TU,";
        if (day === 3) rrule += "WE,";
        if (day === 4) rrule += "TH,";
        if (day === 5) rrule += "FR,";
    }
    rrule = rrule.slice(0, -1);

    rrule += ";INTERVAL=1;UNTIL=" 
        + until[0] 
        + until[1].toString().padStart(2, '0') 
        + until[2].toString().padStart(2, '0') 
        + "T000000Z";
    return rrule;
}

/**
 * Converts an array of exclusions to a string
 * @param exclArr 
 * @returns string of exclusions
 */
export const calculateExclusions = (exclArr: number[][]): string => {
    if (exclArr.length === 0) return "";
    let ret = "";

    for (const exclusion of exclArr) {
        for (let i = 0; i < exclusion[3]; i++) {
            ret += exclusion[0] 
                + (exclusion[1]).toString().padStart(2, '0') 
                + (exclusion[2] + i).toString().padStart(2, '0') 
                + "T000000Z,";
        }
    }

    return ret.slice(0, -1);
}

/**
 * Calculate the correct start date for a section
 * @param start start of the term
 * @param startDay start day of the term
 * @param sectionDays section days value
 * @returns adjusted start date in array
 */
export const calculateStart = (start: number[], startDay: number, 
sectionDays: number): number[] => {
    let dayArr = valueToDays(sectionDays);
    if (dayArr.includes(startDay)) return start;

    dayArr.sort();
    for (let i = 0; i < dayArr.length; i++) 
        if (dayArr[i] > startDay) 
            return [start[0], start[1], start[2] + (dayArr[i] - startDay)];
    
    return [start[0], start[1], start[2] + (7 - startDay + dayArr[0])];
}