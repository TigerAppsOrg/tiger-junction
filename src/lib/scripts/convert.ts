import type { WeekDays } from "$lib/types/regTypes";

//----------------------------------------------------------------------
// Time Conversion Functions
//----------------------------------------------------------------------

// Time Conversion Constants 
const TIME_CONVERSION: Record<string, number> = {
    "ZERO_ADJUST": 48,      
    "HOUR_FACTOR": 6,       
    "MINUTE_FACTOR": 0.1,   
    "NULL_TIME": -42,       
}

/**
 * Converts an am/pm time string to a value
 * @param time in format 'HH:MM AM/PM'
 * @returns value between X and Y
 */
const timeToValue = (time: string) => {
    if (time === undefined) 
        return TIME_CONVERSION.NULL_TIME;

    let dig = time.split(" ")[0].split(":").map((x) => parseInt(x));
    let pm = time.split(" ")[1] === "pm";

    if (dig[0] === 12) dig[0] = 0;

    let val = (dig[0] * TIME_CONVERSION.HOUR_FACTOR)
        + (dig[1] * TIME_CONVERSION.MINUTE_FACTOR)
        - TIME_CONVERSION.ZERO_ADJUST;

    if (pm) val += 12 * TIME_CONVERSION.HOUR_FACTOR;

    // Round to nearest tenth (account for floating point error)
    return Math.round((val * 10)) / 10;
}

/**
 * Converts a military time string to a value
 * @param time in format 'HH:MM' (24 hour/military time)
 * @returns value between X and Y
 */
const militaryToValue = (time: string) => {
    if (time === undefined) 
        return TIME_CONVERSION.NULL_TIME;

    let hour = parseInt(time.slice(0, 2));
    let minute = parseInt(time.slice(3, 5));

    let val = (hour * TIME_CONVERSION.HOUR_FACTOR)
        + (minute * TIME_CONVERSION.MINUTE_FACTOR)
        - TIME_CONVERSION.ZERO_ADJUST;

    // Round to nearest tenth (account for floating point error)
    return Math.round((val * 10)) / 10;
}

/**
 * Converts a value to a military time string 
 * @param value between X and Y
 * @returns time string in format 'HH:MM' (24 hour/military time)
 */
const valueToMilitary = (value: number) => {
    if (value === TIME_CONVERSION.NULL_TIME) return "00:00";

    let hour: number | string = 
        Math.floor(value / TIME_CONVERSION.HOUR_FACTOR) + 8;

    let minute: number | string = 
        Math.round((value % TIME_CONVERSION.HOUR_FACTOR)
            / TIME_CONVERSION.MINUTE_FACTOR);

    // Add leading zeros
    if (hour < 10) hour = `0${hour}`;
    if (minute < 10) minute = `0${minute}`;

    return `${hour}:${minute}`;
}

/**
 * Converts two values to a military time label
 * @param start time value
 * @param end time value
 * @returns formatted time label for display
 */
const valuesToTimeLabel = (start: number, end: number) => {
    let startTime = valueToMilitary(start);
    let endTime = valueToMilitary(end);

    if (startTime === undefined || endTime === undefined) 
        return "";

    // Convert to 12 hour time
    if (parseInt(startTime.slice(0, 2)) > 12) 
        startTime = `${parseInt(startTime.slice(0, 2)) - 12}:${startTime.slice(3, 5)}`;
    
    if (parseInt(endTime.slice(0, 2)) > 12) 
        endTime = `${parseInt(endTime.slice(0, 2)) - 12}:${endTime.slice(3, 5)}`;
    
    // Remove leading zeros
    if (startTime.slice(0, 1) === "0") startTime = startTime.slice(1);
    if (endTime.slice(0, 1) === "0") endTime = endTime.slice(1);

    return `${startTime} - ${endTime}`;
}

/**
 * Tests timeToValue() function
 */
const testTimeToValue = () => {
    const TEST_CASES = {
        "1:00 am": -42,
        "01:00 am": -42,
        "7:30 am": -3,
        "8:00 am": 0,
        "8:30 am": 3,
        "9:00 am": 6,
        "9:30 am": 9,
        "10:00 am": 12,
        "11:00 am": 18,
        "12:00 pm": 24,
        "12:10 pm": 25,
        "12:30 pm": 27,
        "12:31 pm": 27.1,
        "1:00 pm": 30,
        "01:00 pm": 30,
        "1:30 pm": 33,
        "10:00 pm": 84,
        "10:30 pm": 87,
        "10:37 pm": 87.7,
        "11:50 pm": 95,
        "12:00 am": -48,
    } as const;
    type TEST_TIMES = keyof typeof TEST_CASES;

    let success = true;
    console.log("Running timeToValue() tests...");
    for (let time of Object.keys(TEST_CASES) as TEST_TIMES[]) {
        let val = timeToValue(time);
        if (val !== TEST_CASES[time]) {
            console.log(`timeToValue(${time}) = ${val} (expected ${TEST_CASES[time]})`);
            success = false;
        }
    }

    if (success) {
        console.log("timeToValue() tests passed!");
        return true;
    } else {
        console.log("timeToValue() tests failed!");
        return false;
    }
}

//----------------------------------------------------------------------
// Day Conversion Functions
//----------------------------------------------------------------------

/**
 * Converts a section's days to a value
 * @param section with days in format { mon: "Y", tues: "Y", ... }
 * @returns value between 0 and 31
 */
const daysToValue = (section: WeekDays) => {
    let days = 0;
    if (section.mon === "Y") days += 1;
    if (section.tues === "Y") days += 2;
    if (section.wed === "Y") days += 4;
    if (section.thurs === "Y") days += 8;
    if (section.fri === "Y") days += 16;
    return days;
}

/**
 * Converts a value to a section's days
 * @param value between 0 and 31
 * @returns days in number array
 */
const valueToDays = (value: number) => {
    let days = []

    if (value >= 16) {
        days.push(5)
        value -= 16;
    }
    if (value >= 8) {
        days.push(4)
        value -= 8;
    }
    if (value >= 4) {
        days.push(3)
        value -= 4;
    }
    if (value >= 2) {
        days.push(2)
        value -= 2;
    }
    if (value >= 1) {
        days.push(1)
        value -= 1;
    }

    return days;
}


//----------------------------------------------------------------------
// Text Functions
//----------------------------------------------------------------------

/**
 * Normalize text for searching
 * @param text 
 * @returns normalized text
 */
const normalizeText = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

//----------------------------------------------------------------------
// Color Functions
//----------------------------------------------------------------------

/**
 * Darkens an HSL color
 * @param hsl 
 * @param amount 
 * @returns darkened HSL color
 */
const darkenHSL = (hsl: string, amount: number) => {
    let [h, s, l] = hsl.split(",").map((x) => parseInt(x.replace(/\D/g, "")));
    l = Math.max(0, l - amount);
    return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Converts an HSL color to a RGB color
 * @param hsl 
 * @returns RGB color
 */
const hslToRGB = (hsl: string) => {
    let [h, s, l] = hsl.split(",").map((x) => parseInt(x.replace(/\D/g, "")));

    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;

    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');  
    };

    return `#${f(0)}${f(8)}${f(4)}`;
}

const rgbToHSL = (hex: string) => {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r /= 255;
    g /= 255;
    b /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
      ? l === r
        ? (g - b) / s
        : l === g
        ? 2 + (b - r) / s
        : 4 + (r - g) / s
      : 0;
    return `hsl(
      ${60 * h < 0 ? 60 * h + 360 : 60 * h},
      ${100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)},
      ${(100 * (2 * l - s)) / 2},
    )`
}

//----------------------------------------------------------------------

export { 
    timeToValue, 
    militaryToValue, 
    valueToMilitary, 
    valuesToTimeLabel, 
    testTimeToValue,
    daysToValue,
    valueToDays,
    normalizeText,
    darkenHSL,
    hslToRGB,
    rgbToHSL,
}

