-- Create admin user (with private_profiles table)

DROP TABLE IF EXISTS private_profiles;

CREATE TABLE private_profiles (
  id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL,
  PRIMARY KEY(id)
);

ALTER TABLE private_profiles 
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own private profile" ON private_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
AS $$
BEGIN
  INSERT INTO public.profiles(id)
  VALUES (new.id);
  INSERT INTO public.private_profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE PLPGSQL SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION get_is_admin()
  RETURNS boolean
  LANGUAGE SQL
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT private_profiles.is_admin
    FROM private_profiles
    WHERE private_profiles.id = auth.uid()
  $$;