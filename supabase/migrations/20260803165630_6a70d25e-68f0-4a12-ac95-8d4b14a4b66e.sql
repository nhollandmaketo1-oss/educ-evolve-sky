DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['app_settings','app_users','attendance','class_fees','contracts','expense_categories','expenses','grades','invoices','messages','notifications','payments','performance_evaluations','personnel','staff_documents','students']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "open_access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "open_access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

REVOKE ALL ON public.app_sessions FROM anon, authenticated;
GRANT ALL ON public.app_sessions TO service_role;

DROP POLICY IF EXISTS "school_assets_public_read" ON storage.objects;
CREATE POLICY "school_assets_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'school-assets');
DROP POLICY IF EXISTS "school_assets_write" ON storage.objects;
CREATE POLICY "school_assets_write" ON storage.objects FOR ALL TO anon, authenticated USING (bucket_id = 'school-assets') WITH CHECK (bucket_id = 'school-assets');