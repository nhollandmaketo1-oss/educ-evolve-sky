
ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE public.app_users ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('dg', 'de', 'gestionnaire', 'comptable'));

INSERT INTO public.app_users (username, password, role, display_name)
VALUES ('Compta004', '2026', 'comptable', 'Comptable')
ON CONFLICT DO NOTHING;

ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS niveau text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS adresse text,
  ADD COLUMN IF NOT EXISTS date_embauche date,
  ADD COLUMN IF NOT EXISTS diplomes text;

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'CDI',
  date_debut date NOT NULL,
  date_fin date,
  salaire numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'actif',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated, anon;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to contracts" ON public.contracts;
CREATE POLICY "Allow all access to contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.staff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  nom text NOT NULL,
  type text NOT NULL DEFAULT 'autre',
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_documents TO authenticated, anon;
GRANT ALL ON public.staff_documents TO service_role;
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to staff_documents" ON public.staff_documents;
CREATE POLICY "Allow all access to staff_documents" ON public.staff_documents FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.performance_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  periode text NOT NULL,
  objectifs text,
  ponctualite numeric NOT NULL DEFAULT 0,
  pedagogie numeric NOT NULL DEFAULT 0,
  discipline numeric NOT NULL DEFAULT 0,
  participation numeric NOT NULL DEFAULT 0,
  note_globale numeric NOT NULL DEFAULT 0,
  commentaire text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_evaluations TO authenticated, anon;
GRANT ALL ON public.performance_evaluations TO service_role;
ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to performance_evaluations" ON public.performance_evaluations;
CREATE POLICY "Allow all access to performance_evaluations" ON public.performance_evaluations FOR ALL USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_perf_eval_updated_at ON public.performance_evaluations;
CREATE TRIGGER update_perf_eval_updated_at BEFORE UPDATE ON public.performance_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
