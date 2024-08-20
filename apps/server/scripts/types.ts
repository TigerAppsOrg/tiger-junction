export type StringBoolean = "Y" | "N";

export type RegListings = {
  classes: {
    class: {
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
  };
};
