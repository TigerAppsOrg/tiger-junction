-- Ensure emails are only from princeton.edu

CREATE OR REPLACE FUNCTION public.check_princeton_email()
RETURNS TRIGGER AS $$
BEGIN
IF (split_part(new.email, '@', 2) = 'princeton.edu')
  OR (split_part(new.email, '@', 2) = 'alumni.princeton.edu')
  THEN RETURN new;
  ELSE RETURN null;
END IF;
END;

$$ LANGUAGE plpgsql security definer;
CREATE TRIGGER before_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.check_princeton_email();
