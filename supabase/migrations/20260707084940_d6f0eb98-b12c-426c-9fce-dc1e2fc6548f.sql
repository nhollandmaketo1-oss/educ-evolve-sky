
-- Extend allowed roles
ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE public.app_users ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('dg','de','gestionnaire','comptable','parent'));

-- class_fees
CREATE TABLE IF NOT EXISTS public.class_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe text NOT NULL UNIQUE,
  frais_inscription numeric NOT NULL DEFAULT 0,
  frais_mensuel numeric NOT NULL DEFAULT 0,
  mois_count integer NOT NULL DEFAULT 9,
  devise text NOT NULL DEFAULT 'FCFA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_fees TO anon, authenticated;
GRANT ALL ON public.class_fees TO service_role;
ALTER TABLE public.class_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to class_fees" ON public.class_fees FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_class_fees_updated_at BEFORE UPDATE ON public.class_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  student_id uuid NOT NULL,
  classe text NOT NULL,
  mois text,
  type_frais text NOT NULL DEFAULT 'mensuel',
  montant numeric NOT NULL DEFAULT 0,
  date_emission date NOT NULL DEFAULT (now()::date),
  date_echeance date,
  statut text NOT NULL DEFAULT 'emise',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon, authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link students to parent user
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_user_id uuid;
CREATE INDEX IF NOT EXISTS idx_students_parent_user_id ON public.students(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_students_contact_parent ON public.students(contact_parent);
