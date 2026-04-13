import { useState } from "react";
import { getPersonnel, addPersonnel, MATIERES, type Personnel } from "@/lib/store";
import { Plus, X } from "lucide-react";

export function PersonnelModule() {
  const [personnel, setPersonnel] = useState<Personnel[]>(getPersonnel());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", type: "enseignant" as Personnel["type"], matiere: MATIERES[0], salaire: "", telephone: "" });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.prenom) return;
    addPersonnel({ ...form, salaire: Number(form.salaire), matiere: form.type === "enseignant" ? form.matiere : undefined });
    setPersonnel(getPersonnel());
    setShowForm(false);
    setForm({ nom: "", prenom: "", type: "enseignant", matiere: MATIERES[0], salaire: "", telephone: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Gestion du Personnel</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Nouveau Personnel</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <input placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <input placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Personnel["type"] })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                <option value="enseignant">Enseignant</option>
                <option value="surveillant">Surveillant</option>
              </select>
              {form.type === "enseignant" && (
                <select value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                  {MATIERES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
              <input type="number" placeholder="Salaire (FCFA)" value={form.salaire} onChange={(e) => setForm({ ...form, salaire: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <input placeholder="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">Ajouter</button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Nom</th>
                <th className="text-left px-4 py-3 font-medium">Prénom</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Matière</th>
                <th className="text-left px-4 py-3 font-medium">Salaire</th>
                <th className="text-left px-4 py-3 font-medium">Téléphone</th>
              </tr>
            </thead>
            <tbody>
              {personnel.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun personnel enregistré</td></tr>
              ) : personnel.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium">{p.nom}</td>
                  <td className="px-4 py-3">{p.prenom}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.type === "enseignant" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>{p.type}</span>
                  </td>
                  <td className="px-4 py-3">{p.matiere || "—"}</td>
                  <td className="px-4 py-3">{p.salaire.toLocaleString()} FCFA</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.telephone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
