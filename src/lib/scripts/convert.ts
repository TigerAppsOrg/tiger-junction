// Time Conversion Constants 
const TIME_CONVERSION: Record<string, number> = {
    "ZERO_ADJUST": 48,      
    "HOUR_FACTOR": 6,       
    "MINUTE_FACTOR": 0.1,   
    "NULL_TIME": -42,       
}

/**
 * Converts a time string to a value
 * @param time in format 'HH:MM AM/PM'
 * @returns value between X and Y
 */
const timeToValue = (time: string) => {
    if (time === undefined) return TIME_CONVERSION.NULL_TIME;
    if (time === "1:00 am") return TIME_CONVERSION.NULL_TIME;

    let hour = parseInt(time.slice(0, 2));
    let minute = parseInt(time.slice(3, 5));

    let val = (hour * TIME_CONVERSION.HOUR_FACTOR)
        + (minute * TIME_CONVERSION.MINUTE_FACTOR)
        - TIME_CONVERSION.ZERO_ADJUST;

    // Round to nearest tenth (account for floating point error)
    return Math.round((val * 10)) / 10;
}

/**
 * Converts a value to a time string 
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
 * Converts two values to a time label
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

export { timeToValue, valueToMilitary, valuesToTimeLabel }