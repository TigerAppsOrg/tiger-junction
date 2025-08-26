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
  course_id: string;
  subject: string;
  catnum: string;
  long_title: string;
  transcript_title: string;
  description: string;
  grading_basis: string;
  distribution_area_short: string;
  distribution_area_long: string;
  crosslistings: string;
  web_address?: string;
  reading_writing_assignment?: string;
  course_instructors: {
    course_instructor: {
      netid: string;
      name: string;
    };
  };
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
