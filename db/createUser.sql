CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles(id)
  VALUES (new.id);

  -- Create a private profile for the user (for admin purposes)
  INSERT INTO public.private_profiles (id)
  VALUES (new.id);
  
  -- Create default schedules for terms (1242, 1234, 1232)
  INSERT INTO public.schedules (user_id, title, term)
  VALUES (new.id, 'My Schedule', 1242),
         (new.id, 'My Schedule', 1234),
         (new.id, 'My Schedule', 1232);

  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
