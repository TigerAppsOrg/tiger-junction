-- ReCal+ RLS

-- custom_blocks
DROP POLICY IF EXISTS "View: auth is_public" ON public.custom_blocks;
CREATE POLICY "View: auth is_public" ON public.custom_blocks
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "Interact: user" ON public.custom_blocks;
CREATE POLICY "Interact: user" ON public.custom_blocks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- cb_times
DROP POLICY IF EXISTS "Interact: user" ON public.cb_times;
CREATE POLICY "Interact: user" ON public.cb_times
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
    FROM custom_blocks
    WHERE ((custom_blocks.id = cb_times.cb_id) 
    AND (custom_blocks.user_id = auth.uid())))
  ))
  WITH CHECK ((EXISTS ( SELECT 1
    FROM custom_blocks
    WHERE ((custom_blocks.id = cb_times.cb_id) 
    AND (custom_blocks.user_id = auth.uid())))
  ));


-- schedules
DROP POLICY IF EXISTS "View: is_public" ON public.schedules;
CREATE POLICY "View: is_public" ON public.schedules
  AS PERMISSIVE FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "Interact: user" ON public.schedules;
CREATE POLICY "Interact: user" ON public.schedules
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- cb_schedule_associations
DROP POLICY IF EXISTS "Interact: user" ON public.cb_schedule_associations;
CREATE POLICY "Interact: user" ON public.cb_schedule_associations
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
        FROM schedules
        WHERE ((schedules.id = cb_schedule_associations.schedule_id) 
        AND (schedules.user_id = auth.uid())))
    ) AND EXISTS ( SELECT 1
        FROM custom_blocks
        WHERE (( custom_blocks.id = cb_schedule_associations.custom_block_id)
        AND (custom_blocks.user_id = auth.uid()))
  ))
  WITH CHECK ((EXISTS ( SELECT 1
        FROM schedules
        WHERE ((schedules.id = cb_schedule_associations.schedule_id) 
        AND (schedules.user_id = auth.uid())))
    ) AND EXISTS ( SELECT 1
        FROM custom_blocks
        WHERE (( custom_blocks.id = cb_schedule_associations.custom_block_id)
        AND (custom_blocks.user_id = auth.uid()))
  ));


-- course_schedule_associations
DROP POLICY IF EXISTS "Interact: user" ON public.course_schedule_associations;
CREATE POLICY "Interact: user" ON public.course_schedule_associations
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
    FROM schedules
    WHERE ((schedules.id = course_schedule_associations.schedule_id) 
    AND (schedules.user_id = auth.uid())))
  ))
  WITH CHECK ((EXISTS ( SELECT 1
    FROM schedules
    WHERE ((schedules.id = course_schedule_associations.schedule_id) 
    AND (schedules.user_id = auth.uid())))
  ));