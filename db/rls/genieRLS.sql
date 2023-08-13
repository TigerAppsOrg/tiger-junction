-- CourseGenie RLS

-- plans
DROP POLICY IF EXISTS "View: auth is_public" ON public.plans;
CREATE POLICY "View: auth is_public" ON public.plans
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "Interact: user" ON public.plans;
CREATE POLICY "Interact: user" ON public.plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- courselists
DROP POLICY IF EXISTS "View: auth is_public" ON public.courselists;
CREATE POLICY "View: auth is_public" ON public.courselists
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "Interact: user" ON public.courselists;
CREATE POLICY "Interact: user" ON public.courselists
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()) AND (EXISTS ( SELECT 1
    FROM plans
    WHERE ((plans.id = courselists.plan_id) 
    AND (plans.user_id = auth.uid())))
  ))
  WITH CHECK ((user_id = auth.uid()) AND (EXISTS ( SELECT 1
    FROM plans
    WHERE ((plans.id = courselists.plan_id) 
    AND (plans.user_id = auth.uid())))
  ));


-- schedule_courselist_associations


-- listing_courselist_associations


-- programs
DROP POLICY IF EXISTS "View: auth" ON public.programs;
CREATE POLICY "View: auth" ON public.programs
  AS PERMISSIVE FOR SELECT
  TO authenticated

-- courselist_program_associations


-- snatches
DROP POLICY IF EXISTS "Interact: user" ON public.snatches;
CREATE POLICY "Interact: user" ON public.snatches
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);