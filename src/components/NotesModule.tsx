import { useState, useEffect } from "react";
import { getStudents, getGrades, addGrade, CLASSES, MATIERES, type Student, type Grade } from "@/lib/store";
import { Plus, X } from "lucide-react";

export function NotesModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterTrimestre, setFilterTrimestre] = useState(1);
  const [filterClasse, setFilterClasse] = useState("all");
  const [form, setForm] = useState({ student_id: "", matiere: MATIERES[0], note: "", coefficient: "1", trimestre: 1, annee_scolaire: "2025-2026", commentaire: "" });

  useEffect(() => { getStudents().then(setStudents); getGrades().then(setGrades); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id || !form.note) return;
    await addGrade({ ...form, note: Number(form.note), coefficient: Number(form.coefficient), student_id: form.student_id, commentaire: form.commentaire || null });
    setGrades(await getGrades());
    setShowForm(false);
  };

  const filteredStudents = filterClasse === "all" ? students : students.filter((s) => s.classe === filterClasse);
  const filteredGrades = grades.filter((g) => g.trimestre === filterTrimestre);
  const getName = (id: string) => { const s = students.find((st) => st.id === id); return s ? `${s.prenom} ${s.nom}` : "Inconnu"; };
  const getClasse = (id: string) => students.find((st) => st.id === id)?.classe || "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Notes Scolaires</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> Ajouter une note</button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <select value={filterTrimestre} onChange={(e) => setFilterTrimestre(Number(e.target.value))} className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border">
          <option value={1}>1er Trimestre</option><option value={2}>2ème Trimestre</option><option value={3}>3ème Trimestre</option>
        </select>
        <select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border">
          <option value="all">Toutes les classes</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Nouvelle Note</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleAdd} className="space-y-3">
              <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required>
                <option value="">Sélectionner un élève</option>
                {filteredStudents.map((s) => <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe})</option>)}
              </select>
              <select value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                {MATIERES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="number" min="0" max="20" step="0.5" placeholder="Note /20" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <input type="number" min="1" max="5" placeholder="Coefficient" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <select value={form.trimestre} onChange={(e) => setForm({ ...form, trimestre: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                <option value={1}>1er Trimestre</option><option value={2}>2ème Trimestre</option><option value={3}>3ème Trimestre</option>
              </select>
              <input placeholder="Commentaire" value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">Enregistrer</button>
            </form>
          </div>
        </div>
      )}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-secondary text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Élève</th>
              <th className="text-left px-4 py-3 font-medium">Classe</th>
              <th className="text-left px-4 py-3 font-medium">Matière</th>
              <th className="text-left px-4 py-3 font-medium">Note</th>
              <th className="text-left px-4 py-3 font-medium">Coef.</th>
              <th className="text-left px-4 py-3 font-medium">Commentaire</th>
            </tr></thead>
            <tbody>
              {filteredGrades.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucune note</td></tr>
              ) : filteredGrades.filter((g) => filterClasse === "all" || getClasse(g.student_id) === filterClasse).map((g) => (
                <tr key={g.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium">{getName(g.student_id)}</td>
                  <td className="px-4 py-3">{getClasse(g.student_id)}</td>
                  <td className="px-4 py-3">{g.matiere}</td>
                  <td className="px-4 py-3"><span className={`font-bold ${Number(g.note) >= 10 ? "text-success" : "text-destructive"}`}>{g.note}/20</span></td>
                  <td className="px-4 py-3">{g.coefficient}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.commentaire || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
