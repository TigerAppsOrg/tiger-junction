-- General RLS

-- listings
DROP POLICY IF EXISTS "View: auth" ON public.listings;
CREATE POLICY "View: auth" ON public.listings
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);


-- courses
DROP POLICY IF EXISTS "View: auth" ON public.courses;
CREATE POLICY "View: auth" ON public.courses
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);


-- sections
DROP POLICY IF EXISTS "View: auth" ON public.sections;
CREATE POLICY "View: auth" ON public.sections
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);


-- evaluations
DROP POLICY IF EXISTS "View: auth" ON public.evaluations;
CREATE POLICY "View: auth" ON public.evaluations
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);



-- instructors
DROP POLICY IF EXISTS "View: auth" ON public.instructors;
CREATE POLICY "View: auth" ON public.instructors
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);


-- course_instructor_associations
DROP POLICY IF EXISTS "View: auth" ON public.course_instructor_associations;
CREATE POLICY "View: auth" ON public.course_instructor_associations
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- feedback
CREATE POLICY "Enable insert for authenticated users only" ON "public"."feedback"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (true)

