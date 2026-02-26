DROP TABLE IF EXISTS icals;

CREATE TABLE icals (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE
    schedule_id INTEGER REFERENCES schedules(id)
);

ENABLE ROW LEVEL SECURITY ON icals;
DROP POLICY IF EXISTS "Interact: user" ON public.icals;
CREATE POLICY "Interact: user" ON public.icals
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Storage file cleanup is handled in application code via the Supabase Storage API.
-- Direct SQL deletes on storage.objects are blocked by Supabase's protect_objects_delete trigger.