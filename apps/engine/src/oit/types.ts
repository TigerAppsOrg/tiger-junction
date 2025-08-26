export interface OIT_Term {
  code: string;
  suffix: string;
  name: string;
  cal_name: string;
  reg_name: string;
  start_date: string;
  end_date: string;
}

export interface OIT_Instructor {
  emplid: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface OIT_Meeting {
  meeting_number: string;
  start_time: string;
  end_time: string;
  days: string[];
  room?: string;
  building?: {
    location_code: string;
    name: string;
  };
}

export interface OIT_Class {
  class_number: string;
  section: string;
  status: string;
  type_name: string;
  capacity: string;
  enrollment: string;
  schedule: {
    start_date: string;
    end_date: string;
    meetings: OIT_Meeting[];
  };
}

export interface OIT_Course {
  guid: string;
  course_id: string;
  catalog_number: string;
  title: string;
  detail: {
    start_date: string;
    end_date: string;
    track: string;
    description: string;
    seat_reservations: string;
  };
  instructors: OIT_Instructor[];
  crosslistings?: Array<{
    subject: string;
    catalog_number: string;
  }>;
  classes: OIT_Class[];
}

export interface OIT_Subject {
  code: string;
  name: string;
  courses: OIT_Course[];
}

export interface OIT_CoursesResponse {
  term: Array<{
    code: string;
    name: string;
    suffix: string;
    cal_name: string;
    reg_name: string;
    start_date: string;
    end_date: string;
    subjects: OIT_Subject[];
  }>;
}

export interface OIT_SeatInfo {
  class_number: string;
  capacity: string;
  enrollment: string;
}

export interface OIT_SeatsResponse {
  course: Array<{
    course_id: string;
    classes: OIT_SeatInfo[];
  }>;
}

export interface OIT_CourseDetails {
  // Basic course info
  course_id: string;
  subject: string;
  catnum: string;
  long_title: string;
  transcript_title: string;
  description: string;
  term: string;
  crosslistings: string;
  topic_title: string | null;

  // Grading and academic info
  grading_basis: string;
  distribution_area_short: string;
  distribution_area_long: string;

  // Consent and flags
  add_consent: string;
  drop_consent: string;
  pu_flag: string;

  // Grading breakdown (string numbers like "0", "30", "40")
  grading_oral_pres: string;
  grading_paper_mid_exam: string;
  grading_quizzes: string;
  grading_home_mid_exam: string;
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

  // Course head info
  course_head_name: string | null;
  course_head_netid: string | null;

  // Additional info
  web_address?: string;
  reading_writing_assignment?: string;
  other_information: string | null;
  other_restrictions: string | null;
  other_requirements: string | null;

  // Reading list
  reading_list_author_1?: string;
  reading_list_author_2?: string;
  reading_list_author_3?: string;
  reading_list_author_4?: string;
  reading_list_author_5?: string;
  reading_list_author_6?: string;
  reading_list_title_1?: string;
  reading_list_title_2?: string;
  reading_list_title_3?: string;
  reading_list_title_4?: string;
  reading_list_title_5?: string;
  reading_list_title_6?: string;

  // Instructors - note the structure difference from your original
  course_instructors: {
    course_instructor:
      | {
          netid: string;
          name: string;
        }
      | Array<{
          netid: string;
          name: string;
        }>;
  };

  // Seat reservations
  seat_reservations?: {
    seat_reservation: Array<{
      class_section: string;
      description: string;
      enrl_cap: string;
    }>;
  };
}

export type StringBoolean = "Y" | "N";

export type OIT_RegListing = {
  class_number: string;
  crosslistings: string;
  subject: string;
  distribution_area: string | null;
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
  meeting_pattern: string | null;
  acad_career: "UGRD" | "GRAD";
  long_title: string;
  start_time: string | null;
  end_time: string | null;
  topic_title: string | null;
  class_status: "A" | "X";
};
