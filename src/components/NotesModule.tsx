import { useState, useEffect, useMemo } from "react";
import { getStudents, getGrades, addGradesBulk, getMatieresForClass, CLASSES, type Student, type Grade } from "@/lib/store";
import { Save, FileText } from "lucide-react";
import { toast } from "sonner";

export function NotesModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [filterTrimestre, setFilterTrimestre] = useState(1);
  const [filterClasse, setFilterClasse] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [trimestre, setTrimestre] = useState(1);
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { getStudents().then(setStudents); getGrades().then(setGrades); }, []);

  const student = students.find((s) => s.id === selectedStudent) || null;
  const matieres = useMemo(() => (student ? getMatieresForClass(student.classe) : []), [student]);

  // Preload existing notes for selected student/trimestre
  useEffect(() => {
    if (!student) { setNoteValues({}); return; }
    const existing: Record<string, string> = {};
    grades
      .filter((g) => g.student_id === student.id && g.trimestre === trimestre)
      .forEach((g) => { existing[g.matiere] = String(g.note); });
    setNoteValues(existing);
  }, [student, trimestre, grades]);

  const filteredStudents = filterClasse === "all" ? students : students.filter((s) => s.classe === filterClasse);
  const filteredGrades = grades.filter((g) => g.trimestre === filterTrimestre);
  const getName = (id: string) => { const s = students.find((st) => st.id === id); return s ? `${s.prenom} ${s.nom}` : "Inconnu"; };
  const getClasse = (id: string) => students.find((st) => st.id === id)?.classe || "";

  const handleSave = async () => {
    if (!student) return;
    setSaving(true);
    const items = matieres
      .filter((m) => noteValues[m.matiere] !== undefined && noteValues[m.matiere] !== "")
      .map((m) => ({
        student_id: student.id,
        matiere: m.matiere,
        note: Number(noteValues[m.matiere]),
        coefficient: m.coefficient,
        trimestre,
        annee_scolaire: "2025-2026",
        commentaire: commentaire || null,
      }));
    if (items.length === 0) {
      toast.warning("Aucune note saisie");
      setSaving(false);
      return;
    }
    await addGradesBulk(items);
    setGrades(await getGrades());
    setCommentaire("");
    setSaving(false);
    toast.success(`${items.length} note(s) enregistrée(s) pour ${student.prenom} ${student.nom}`);
  };

  // compute live moyenne preview
  const preview = useMemo(() => {
    let totalP = 0, totalC = 0;
    for (const m of matieres) {
      const v = noteValues[m.matiere];
      if (v !== undefined && v !== "" && !Number.isNaN(Number(v))) {
        totalP += Number(v) * m.coefficient;
        totalC += m.coefficient;
      }
    }
    return totalC > 0 ? (totalP / totalC).toFixed(2) : "—";
  }, [noteValues, matieres]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Notes Scolaires</h2>
      </div>

      {/* Saisie en bloc par élève */}
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Saisir les notes d'un élève (toutes matières)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-input text-foreground border border-border">
            <option value="">— Sélectionner un élève —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe})</option>)}
          </select>
          <select value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl bg-input text-foreground border border-border">
            <option value={1}>1er Trimestre</option><option value={2}>2ème Trimestre</option><option value={3}>3ème Trimestre</option>
          </select>
          <div className="px-3 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/30 text-sm font-semibold flex items-center justify-between">
            <span>Moyenne estimée</span>
            <span className="text-lg">{preview}/20</span>
          </div>
        </div>

        {student && matieres.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {matieres.map((m) => (
                <div key={m.matiere} className="bg-secondary/50 rounded-xl p-3 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">{m.matiere}</label>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">Coef. {m.coefficient}</span>
                  </div>
                  <input
                    type="number" min="0" max="20" step="0.25"
                    placeholder="/20"
                    value={noteValues[m.matiere] || ""}
                    onChange={(e) => setNoteValues({ ...noteValues, [m.matiere]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-input text-foreground border border-border text-center font-bold text-lg"
                  />
                </div>
              ))}
            </div>
            <textarea
              placeholder="Commentaire général (optionnel)"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-input text-foreground border border-border text-sm"
            />
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50">
              <Save className="w-4 h-4" /> Enregistrer le bulletin
            </button>
          </>
        )}
        {student && matieres.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune matière configurée pour la classe « {student.classe} ».</p>
        )}
      </div>

      {/* Vue consultation */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterTrimestre} onChange={(e) => setFilterTrimestre(Number(e.target.value))} className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border">
          <option value={1}>1er Trimestre</option><option value={2}>2ème Trimestre</option><option value={3}>3ème Trimestre</option>
        </select>
        <select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border">
          <option value="all">Toutes les classes</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-secondary text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Élève</th>
              <th className="text-left px-4 py-3 font-medium">Classe</th>
              <th className="text-left px-4 py-3 font-medium">Matière</th>
              <th className="text-left px-4 py-3 font-medium">Note</th>
              <th className="text-left px-4 py-3 font-medium">Coef.</th>
            </tr></thead>
            <tbody>
              {filteredGrades.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucune note</td></tr>
              ) : filteredGrades.filter((g) => filterClasse === "all" || getClasse(g.student_id) === filterClasse).map((g) => (
                <tr key={g.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium">{getName(g.student_id)}</td>
                  <td className="px-4 py-3">{getClasse(g.student_id)}</td>
                  <td className="px-4 py-3">{g.matiere}</td>
                  <td className="px-4 py-3"><span className={`font-bold ${Number(g.note) >= 10 ? "text-success" : "text-destructive"}`}>{g.note}/20</span></td>
                  <td className="px-4 py-3">{g.coefficient}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
