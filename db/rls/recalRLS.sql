-- ReCal+ RLS
ALTER TABLE custom_blocks
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE cb_times
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE schedules
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE cb_schedule_associations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE course_schedule_associations
  ENABLE ROW LEVEL SECURITY;
