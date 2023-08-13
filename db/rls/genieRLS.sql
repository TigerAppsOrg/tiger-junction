-- CourseGenie RLS
ALTER TABLE plans
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View: auth is_public" ON public.plans;
CREATE POLICY "Authenticated users can view public plans" ON public.plans
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "Interact: user" ON public.plans;
CREATE POLICY "Interact: user" ON public.plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


ALTER TABLE courselists
  ENABLE ROW LEVEL SECURITY;

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


ALTER TABLE schedule_courselist_associations
  ENABLE ROW LEVEL SECURITY;


ALTER TABLE listing_courselist_associations
  ENABLE ROW LEVEL SECURITY;


ALTER TABLE programs
  ENABLE ROW LEVEL SECURITY;


ALTER TABLE courselist_program_associations
  ENABLE ROW LEVEL SECURITY;


ALTER TABLE snatches
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Interact: user" ON public.snatches;
CREATE POLICY "Interact: user" ON public.snatches
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);