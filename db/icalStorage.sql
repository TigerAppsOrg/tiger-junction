DROP TABLE IF EXISTS icals;

CREATE TABLE icals (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE
);

DROP POLICY IF EXISTS "Interact: user" ON public.icals;
CREATE POLICY "Interact: user" ON public.icals
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);