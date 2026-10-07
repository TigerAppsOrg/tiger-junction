-- Indexes for the hot PostgREST and scraper lookups
-- CONCURRENTLY cannot run in a transaction, so run each statement on its own

-- Courses for a term
CREATE INDEX CONCURRENTLY IF NOT EXISTS courses_term_idx
  ON public.courses (term);

-- Seat updater matches on (course_id, num), also serves course_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS sections_course_id_num_idx
  ON public.sections (course_id, num);

-- User schedule list and the auth.uid() = user_id RLS check
CREATE INDEX CONCURRENTLY IF NOT EXISTS schedules_user_id_term_idx
  ON public.schedules (user_id, term);

-- PK leads with course_id so schedule_id lookups need their own index
CREATE INDEX CONCURRENTLY IF NOT EXISTS course_schedule_associations_schedule_id_idx
  ON public.course_schedule_associations (schedule_id);

-- User events and the auth.uid() = user_id RLS check
CREATE INDEX CONCURRENTLY IF NOT EXISTS events_user_id_idx
  ON public.events (user_id);
