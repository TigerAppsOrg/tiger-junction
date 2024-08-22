export type StringBoolean = "Y" | "N";

export type RegListings = {
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
}[];

export type RegDeptCourses = {}[];

export type RegCourseDetails = {
  subject: string;
  catnum: string;
  crosslistings: string;
  description: string;
  term: string;
  grading_basis: string;
  course_id: string;

  transcript_title: string;
  topic_title: string;
  long_title: string;
  distribution_area_short: string | null;
  course_head_netid: string | null;

  add_consent: StringBoolean;
  drop_consent: StringBoolean;
  pu_flag: StringBoolean;
  web_address: string | null;
  other_restrictions: string | null;
  other_requirements: string | null;
  other_information: string | null;

  // Check if this is correct
  course_instructors: {
    course_instructor: {
      netid: string;
      name: string;
    };
  };

  seat_reservations: {
    seat_reservation: {};
  };

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
