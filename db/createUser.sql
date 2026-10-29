CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles(id)
  VALUES (new.id);

  -- Create a private profile for the user (for admin purposes)
  INSERT INTO public.private_profiles (id)
  VALUES (new.id);
  
  -- Create default schedules for Spring 2027, Fall 2026, and Spring 2026
  INSERT INTO public.schedules (user_id, title, term)
  VALUES (new.id, 'My Schedule', 1274),
         (new.id, 'My Schedule', 1272),
         (new.id, 'My Schedule', 1264);


  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
