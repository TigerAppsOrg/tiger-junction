-- Grant admins interact permissions on all tables

DO
$$
DECLARE
  row record;
BEGIN
  FOR row IN SELECT tablename FROM pg_tables AS t
    WHERE t.schemaname = 'public' 
  LOOP
    EXECUTE format('ALTER TABLE %I 
                      ENABLE ROW LEVEL SECURITY;', row.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Interact: admin" ON %I;', 
                      row.tablename);
    EXECUTE format('CREATE POLICY "Interact: admin" ON %I 
                      TO authenticated
                      WITH CHECK (get_is_admin());', row.tablename); 
  END LOOP;
END;
$$;

