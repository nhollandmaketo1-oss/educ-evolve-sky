import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSchoolName } from "@/hooks/useSchoolName";
import { Settings, School, Save, Trash2, Check } from "lucide-react";

export function ParametresModule() {
  const { user } = useAuth();
  const { schoolName, setSchoolName, loading } = useSchoolName();
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(schoolName);
  }, [schoolName]);

  if (user?.role !== "dg") {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Seul le Directeur Général peut accéder aux paramètres de l'application.
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setSchoolName(draft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = async () => {
    await setSchoolName("");
    setDraft("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-display)] text-foreground">
            Paramètres de l'application
          </h2>
          <p className="text-sm text-muted-foreground">
            Centralisez les réglages globaux. Les modifications s'appliquent partout (titres, bulletins PDF, rapports).
          </p>
        </div>
      </div>

      {/* Identité de l'école */}
      <section className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center gap-2">
          <School className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Identité de l'école</h3>
        </header>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label htmlFor="school_name" className="block text-sm font-medium text-foreground mb-1">
              Nom de l'école
            </label>
            <input
              id="school_name"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ex : Collège Saint-Joseph de Brazzaville"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Ce nom apparaîtra automatiquement dans la barre supérieure, en en-tête des bulletins PDF, des rapports de présence et dans les titres des tableaux.
              Laissez vide pour utiliser le nom par défaut <strong>EDUC 2.0</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Enregistrer
            </button>
            {schoolName && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20"
              >
                <Trash2 className="w-4 h-4" /> Réinitialiser
              </button>
            )}
            {saved && (
              <span className="flex items-center gap-1 px-3 py-2 text-sm text-success">
                <Check className="w-4 h-4" /> Enregistré
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Aperçu */}
      <section className="bg-card rounded-2xl shadow-sm border border-border p-5">
        <h3 className="font-semibold text-foreground mb-3">Aperçu</h3>
        <div className="space-y-2 text-sm">
          <div className="p-3 rounded-xl bg-secondary">
            <span className="text-xs uppercase text-muted-foreground">En-tête bulletin PDF</span>
            <p className="font-bold text-primary mt-1">
              {(draft.trim() || "EDUC 2.0").toUpperCase()} — BULLETIN SCOLAIRE
            </p>
          </div>
          <div className="p-3 rounded-xl bg-secondary">
            <span className="text-xs uppercase text-muted-foreground">Rapport de présence</span>
            <p className="font-bold text-primary mt-1">
              {draft.trim() || "EDUC 2.0"} — Rapport de Présence au Poste
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
