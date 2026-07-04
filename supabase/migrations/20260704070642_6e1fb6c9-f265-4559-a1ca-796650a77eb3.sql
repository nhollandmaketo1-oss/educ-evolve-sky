
-- Catégories de dépenses
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage expense categories" ON public.expense_categories FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE TRIGGER trg_expense_categories_updated BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dépenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  categorie TEXT NOT NULL,
  fournisseur TEXT,
  description TEXT NOT NULL,
  montant NUMERIC(12,2) NOT NULL CHECK (montant >= 0),
  mode_paiement TEXT NOT NULL DEFAULT 'especes',
  reference TEXT,
  justificatif_url TEXT,
  statut TEXT NOT NULL DEFAULT 'paye',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage expenses" ON public.expenses FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_expenses_date ON public.expenses(date_depense DESC);
CREATE INDEX idx_expenses_categorie ON public.expenses(categorie);

-- Catégories par défaut
INSERT INTO public.expense_categories (nom, description) VALUES
  ('Fournitures scolaires', 'Cahiers, stylos, matériel pédagogique'),
  ('Loyer', 'Loyer des locaux'),
  ('Électricité & Eau', 'Factures utilities'),
  ('Salaires', 'Charges de personnel'),
  ('Maintenance', 'Réparations et entretien'),
  ('Transport', 'Carburant, déplacements'),
  ('Communication', 'Téléphone, internet'),
  ('Événements', 'Sorties, célébrations'),
  ('Autres', 'Charges diverses');
