/**
 * @file scripts/reg-types.ts
 * @description This file contains types for the registrar API data.
 * I pray this does not change anytime in the near future.
 * @author Joshua Lau
 */

import { Status } from "./db-types";

export type StringBoolean = "Y" | "N";

export type RegListing = {
    class_number: string;
    crosslistings: string;
    subject: string;
    distribution_area: string;
    section: string;
    building_code: string | null;
    building_name: string | null;
    room: string | null;
    catnum: string;
    mon: StringBoolean;
    tues: StringBoolean;
    wed: StringBoolean;
    thurs: StringBoolean;
    fri: StringBoolean;
    sat: StringBoolean;
    sun: StringBoolean;
    term: string;
    course_id: string;
    class_meetings: string;
    meeting_pattern: string;
    acad_career: string;
    end_time: string;
    long_title: string;
    start_time: string;
    topic_title: string | null;
    class_status: string;
};

export type RegDeptCourse = {
    guid: string;
    course_id: string;
    catalog_number: string;
    title: string;
    detail: {
        start_date: string;
        end_date: string;
        track: string;
        description: string;
        seat_reservations: StringBoolean;
    };
    instructors: {
        emplid: string;
        first_name: string;
        last_name: string;
        full_name: string;
    }[];
    crosslistings: {
        subject: string;
        catalog_number: string;
    }[];
    classes: {
        class_number: string;
        section: string;
        status: string;
        pu_calc_status: string;
        seat_status: string;
        type_name: string;
        capacity: string;
        enrollment: string;
        schedule: {
            start_date: string;
            end_date: string;
            meetings: {
                meeting_number: string;
                start_time: string;
                end_time: string;
                days: string[];
                building?: {
                    location_code: string;
                    name: string;
                };
                room?: string;
            }[];
        };
    }[];
};

export type RegCourseDetails = {
    subject: string;
    catnum: string;
    crosslistings: string;
    description: string;
    term: string;
    grading_basis: string;
    course_id: string;

    transcript_title: string | null;
    topic_title: string | null;
    long_title: string | null;
    distribution_area_short: string | null;
    course_head_netid: string | null;

    add_consent: StringBoolean;
    drop_consent: StringBoolean;
    pu_flag: StringBoolean;
    web_address: string | null;
    other_restrictions: string | null;
    other_requirements: string | null;
    other_information: string | null;

    course_instructors: {
        course_instructor:
            | {
                  netid: string;
                  name: string;
              }[]
            | {
                  netid: string;
                  name: string;
              };
    } | null;

    seat_reservations: {
        seat_reservation:
            | {
                  class_section: string;
                  description: string;
                  enrl_cap: string;
              }[]
            | {
                  class_section: string;
                  description: string;
                  enrl_cap: string;
              };
    } | null;

    reading_list_title_1: string | null;
    reading_list_author_1: string | null;
    reading_list_title_2: string | null;
    reading_list_author_2: string | null;
    reading_list_title_3: string | null;
    reading_list_author_3: string | null;
    reading_list_title_4: string | null;
    reading_list_author_4: string | null;
    reading_list_title_5: string | null;
    reading_list_author_5: string | null;
    reading_list_title_6: string | null;
    reading_list_author_6: string | null;
    reading_writing_assignment: string | null;

    grading_oral_pres: string;
    grading_quizzes: string;
    grading_other_exam: string;
    grading_lab_reports: string;
    grading_paper_final_exam: string;
    grading_papers: string;
    grading_mid_exam: string;
    grading_prog_assign: string;
    grading_final_exam: string;
    grading_design_projects: string;
    grading_other: string;
    grading_home_final_exam: string;
    grading_prob_sets: string;
    grading_precept_part: string;
    grading_term_papers: string;
};

export type RegSeat = {
    listingId: string;
    sections: {
        num: string;
        tot: number;
        cap: number;
        status: Status;
    }[];
};
