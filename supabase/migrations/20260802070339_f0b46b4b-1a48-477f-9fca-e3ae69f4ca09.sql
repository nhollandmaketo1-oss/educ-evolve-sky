-- 1) Remove all public/anon access to application tables. All access now goes
--    through server functions using the service role.
DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow all access to app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow all access to attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow all access to class_fees" ON public.class_fees;
DROP POLICY IF EXISTS "Allow all access to contracts" ON public.contracts;
DROP POLICY IF EXISTS "Auth manage expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Auth manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow all access to grades" ON public.grades;
DROP POLICY IF EXISTS "Allow all access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow all access to messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all access to notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all access to payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all access to performance_evaluations" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Allow all access to personnel" ON public.personnel;
DROP POLICY IF EXISTS "Allow all access to staff_documents" ON public.staff_documents;
DROP POLICY IF EXISTS "Allow all access to students" ON public.students;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_settings','app_users','attendance','class_fees','contracts',
    'expense_categories','expenses','grades','invoices','messages',
    'notifications','payments','performance_evaluations','personnel',
    'staff_documents','students'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- 2) Server-side session store for the application's custom credential login.
CREATE TABLE IF NOT EXISTS public.app_sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

GRANT ALL ON public.app_sessions TO service_role;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (server functions) can read/write sessions.

CREATE INDEX IF NOT EXISTS app_sessions_user_id_idx ON public.app_sessions (user_id);

-- 3) Storage: remove anonymous write/list access on every bucket.
DROP POLICY IF EXISTS "Anyone can delete school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "staff_documents_all" ON storage.objects;