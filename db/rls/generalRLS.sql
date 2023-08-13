-- General RLS

-- themes
DROP POLICY IF EXISTS "View: auth is_public" ON public.themes;
CREATE POLICY "View: auth is_public" ON public.themes
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "Interact: user" ON public.themes;
CREATE POLICY "Interact: user" ON public.themes
  FOR ALL
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- listings
DROP POLICY IF EXISTS "View: auth" ON public.listings;
CREATE POLICY "View: auth" ON public.listings
  AS PERMISSIVE FOR SELECT
  TO authenticated


-- courses
DROP POLICY IF EXISTS "View: auth" ON public.courses;
CREATE POLICY "View: auth" ON public.courses
  AS PERMISSIVE FOR SELECT
  TO authenticated


-- sections
DROP POLICY IF EXISTS "View: auth" ON public.sections;
CREATE POLICY "View: auth" ON public.sections
  AS PERMISSIVE FOR SELECT
  TO authenticated


-- evaluations
DROP POLICY IF EXISTS "View: auth" ON public.evaluations;
CREATE POLICY "View: auth" ON public.evaluations
  AS PERMISSIVE FOR SELECT
  TO authenticated


-- prereqs
DROP POLICY IF EXISTS "View: auth" ON public.prereqs;
CREATE POLICY "View: auth" ON public.prereqs
  AS PERMISSIVE FOR SELECT
  TO authenticated


-- instructors
DROP POLICY IF EXISTS "View: auth" ON public.instructors;
CREATE POLICY "View: auth" ON public.instructors
  AS PERMISSIVE FOR SELECT
  TO authenticated


-- course_instructor_associations
DROP POLICY IF EXISTS "View: auth" ON public.course_instructor_associations;
CREATE POLICY "View: auth" ON public.course_instructor_associations
  AS PERMISSIVE FOR SELECT
  TO authenticated


-- section_data (admin only)