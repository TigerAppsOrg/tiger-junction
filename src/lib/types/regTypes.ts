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
    building_name: string | null,
    room: string | null,
    enrl_tot: string,
    enrl_cap: string,
    start_time: string,
    end_time: string,
    status: string,
    [key: string]: any,
};

type RegReadingInfo = {
    reading_list_title_1: string,
    reading_list_author_1: string,
    reading_list_title_2: string,
    reading_list_author_2: string,
    reading_list_title_3: string,
    reading_list_author_3: string,
    reading_list_title_4: string,
    reading_list_author_4: string,
    reading_list_title_5: string,
    reading_list_author_5: string,
    reading_list_title_6: string,
    reading_list_author_6: string,
}

type RegGradingInfo = {
    grading_design_projects: string,
    grading_final_exam: string,
    grading_home_final_exam: string,
    grading_home_mid_exam: string,
    grading_lab_reports: string,
    grading_mid_exam: string,
    grading_oral_pres: string,
    grading_other: string,
    grading_other_exam: string,
    grading_paper_final_exam: string,
    grading_paper_mid_exam: string,
    grading_papers: string,
    grading_precept_part: string,
    grading_prob_sets: string,
    grading_prog_assign: string,
    grading_quizzes: string,
    grading_term_papers: string,
    pu_projects: string,
    pu_pres_final_exam: string,
}

type RegSeatReservation = {
    class_section: string,
    description: string,
    enrl_cap: string,
}

type RegCourse = RegGradingInfo & RegReadingInfo & {
    catnum: string,
    course_equivalents: any,
    course_id: string,
    course_instructors: any,
    course_sections: {
        course_section: RegSection[],
    },
    crosslistings: string,
    description: string,
    distribution_area_short: string,
    grading_basis: string,
    long_title: string,
    other_information: string,
    other_requirements: string,
    other_restrictions: string,
    reading_writing_assignment: string,
    seat_reservations: {
        seat_reservation: RegSeatReservation[],
    },
    subject: string,
    term: string,
    topic_title: string,
    [key: string]: any,
}

export type { WeekDays, RegSection, RegReadingInfo, RegGradingInfo, RegSeatReservation, RegCourse }