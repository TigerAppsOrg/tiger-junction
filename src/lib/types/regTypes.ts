// Type definitions for the data returned by the registrar API

type WeekDays = {
    mon: string,
    tues: string,
    wed: string,
    thurs: string,
    fri: string,
    [key: string]: any,
};

type RegSection = WeekDays & {
    section: string,
    class_number: string,
    building: string | null,
    room: string | null,
    enrl_tot: string,
    enrl_cap: string,
    start_time: string,
    end_time: string,
    [key: string]: any,
};

export type { WeekDays, RegSection }