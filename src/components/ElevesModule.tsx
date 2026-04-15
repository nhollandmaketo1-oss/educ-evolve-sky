import { useState, useEffect } from "react";
import { getStudents, addStudent, CLASSES, type Student } from "@/lib/store";
import { Plus, X } from "lucide-react";

export function ElevesModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", classe: CLASSES[0], contact_parent: "", montant_inscription: "" });
  const [filterClasse, setFilterClasse] = useState("all");

  useEffect(() => { getStudents().then(setStudents); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.prenom) return;
    await addStudent({ ...form, montant_inscription: Number(form.montant_inscription) || 0, date_inscription: new Date().toISOString(), status: "actif" });
    setStudents(await getStudents());
    setForm({ nom: "", prenom: "", classe: CLASSES[0], contact_parent: "", montant_inscription: "" });
    setShowForm(false);
  };

  const filtered = filterClasse === "all" ? students : students.filter((s) => s.classe === filterClasse);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Gestion des Élèves</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Inscrire un élève
        </button>
      </div>
      <select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border">
        <option value="all">Toutes les classes</option>
        {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Inscription d&apos;un élève</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <input placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <input placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <select value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="Contact parent (nom & téléphone)" value={form.contact_parent} onChange={(e) => setForm({ ...form, contact_parent: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <input type="number" placeholder="Montant inscription (FCFA)" value={form.montant_inscription} onChange={(e) => setForm({ ...form, montant_inscription: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">Inscrire</button>
            </form>
          </div>
        </div>
      )}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-secondary text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Nom</th>
              <th className="text-left px-4 py-3 font-medium">Prénom</th>
              <th className="text-left px-4 py-3 font-medium">Classe</th>
              <th className="text-left px-4 py-3 font-medium">Contact Parent</th>
              <th className="text-left px-4 py-3 font-medium">Inscription</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Statut</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Aucun élève inscrit</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium">{s.nom}</td>
                  <td className="px-4 py-3">{s.prenom}</td>
                  <td className="px-4 py-3">{s.classe}</td>
                  <td className="px-4 py-3">{s.contact_parent || "—"}</td>
                  <td className="px-4 py-3">{Number(s.montant_inscription).toLocaleString()} FCFA</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s.date_inscription).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.status === "actif" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
