DROP TABLE IF EXISTS public.icals;

CREATE TABLE public.icals (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    schedule_id INTEGER REFERENCES public.schedules(id)
);

ALTER TABLE public.icals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Interact: user" ON public.icals;
CREATE POLICY "Interact: user" ON public.icals
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND (
            schedule_id IS NULL
            OR EXISTS (
                SELECT 1
                FROM public.schedules AS schedules
                WHERE schedules.id = schedule_id
                AND schedules.user_id = auth.uid()
            )
        )
    );

-- Storage file cleanup is handled in application code via the Supabase Storage API.
-- Direct SQL deletes on storage.objects are blocked by Supabase's protect_objects_delete trigger.
