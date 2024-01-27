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

-- Delete old ical storage entry when db row is delete
CREATE OR REPLACE FUNCTION public.handle_ical_deletion()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'calendars' AND NAME = concat(OLD.id, '.ics');
    RETURN OLD;
END;
$$ LANGUAGE plpgsql security definer;
CREATE TRIGGER on_ical_deleted
    AFTER DELETE ON public.icals
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_ical_deletion();