import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSchoolName } from "@/hooks/useSchoolName";
import { supabase } from "@/integrations/supabase/client";
import { Settings, School, Save, Trash2, Check, ImagePlus, Loader2 } from "lucide-react";

export function ParametresModule() {
  const { user } = useAuth();
  const { schoolName, schoolLogo, setSchoolName, setSchoolLogo, loading } = useSchoolName();
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = async (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Veuillez sélectionner une image (PNG, JPG, SVG…).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Le fichier dépasse 2 Mo.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `logos/school-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("school-assets")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("school-assets").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      await setSchoolLogo(url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Échec du téléversement.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogoRemove = async () => {
    await setSchoolLogo("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const previewName = (draft.trim() || "EDUC 2.0");

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

        <div className="p-5 space-y-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Logo de l'école</label>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-24 h-24 rounded-2xl bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="Logo de l'école" className="w-full h-full object-contain" />
                ) : (
                  <School className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                    {schoolLogo ? "Changer le logo" : "Téléverser un logo"}
                  </button>
                  {schoolLogo && (
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20"
                    >
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou SVG — 2 Mo max. Le logo s'affiche automatiquement dans la sidebar, le tableau de bord et en en-tête des bulletins PDF & rapports.
                </p>
                {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
              </div>
            </div>
          </div>

          {/* Nom */}
          <form onSubmit={handleSave} className="space-y-3">
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
                Laissez vide pour utiliser le nom par défaut <strong>EDUC 2.0</strong>.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Enregistrer le nom
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
        </div>
      </section>

      {/* Aperçu */}
      <section className="bg-card rounded-2xl shadow-sm border border-border p-5">
        <h3 className="font-semibold text-foreground mb-3">Aperçu en-tête</h3>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary">
          {schoolLogo ? (
            <img src={schoolLogo} alt="Logo" className="w-14 h-14 rounded-xl object-contain bg-card p-1 border border-border" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-card border border-border flex items-center justify-center">
              <School className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-bold text-primary">{previewName.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">Bulletin scolaire / Rapport de présence</p>
          </div>
        </div>
      </section>
    </div>
  );
}
