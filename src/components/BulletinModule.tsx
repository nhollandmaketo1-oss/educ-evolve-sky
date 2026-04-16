import { useState, useEffect, useRef } from "react";
import { getStudents, getGrades, addGrade, CLASSES, MATIERES, type Student, type Grade } from "@/lib/store";
import { FileText, Printer, Plus, X } from "lucide-react";

// Coefficients Congo (système officiel)
const COEFFICIENTS_CONGO: Record<string, Record<string, number>> = {
  primaire: {
    "Français": 5, "Mathématiques": 5, "Anglais": 1, "SVT": 1,
    "Histoire-Géographie": 2, "EPS": 1, "Éducation Civique": 1,
    "Dessin": 1, "Musique": 1, "Physique-Chimie": 1, "Informatique": 1, "Philosophie": 1,
  },
  college: {
    "Français": 4, "Mathématiques": 4, "Anglais": 2, "Physique-Chimie": 2,
    "SVT": 2, "Histoire-Géographie": 2, "EPS": 1, "Éducation Civique": 1,
    "Informatique": 1, "Dessin": 1, "Musique": 1, "Philosophie": 1,
  },
  lycee: {
    "Français": 3, "Mathématiques": 5, "Anglais": 2, "Physique-Chimie": 4,
    "SVT": 3, "Histoire-Géographie": 2, "Philosophie": 3, "EPS": 1,
    "Informatique": 1, "Éducation Civique": 1, "Dessin": 1, "Musique": 1,
  },
};

function getLevel(classe: string): string {
  if (["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"].includes(classe)) return "primaire";
  if (["6ème", "5ème", "4ème", "3ème"].includes(classe)) return "college";
  return "lycee";
}

function getCoef(classe: string, matiere: string): number {
  const level = getLevel(classe);
  return COEFFICIENTS_CONGO[level]?.[matiere] || 1;
}

interface BulletinData {
  student: Student;
  trimestre: number;
  lignes: { matiere: string; note: number; coefficient: number; total: number; commentaire: string | null }[];
  totalPoints: number;
  totalCoef: number;
  moyenne: number;
}

export function BulletinModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [filterClasse, setFilterClasse] = useState("all");
  const [filterTrimestre, setFilterTrimestre] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [bulletin, setBulletin] = useState<BulletinData | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ student_id: "", matiere: MATIERES[0], note: "", commentaire: "" });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getStudents().then(setStudents); getGrades().then(setGrades); }, []);

  const filteredStudents = filterClasse === "all" ? students : students.filter((s) => s.classe === filterClasse);

  const generateBulletin = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    setSelectedStudent(studentId);

    const studentGrades = grades.filter((g) => g.student_id === studentId && g.trimestre === filterTrimestre);

    // Group by matiere, take average if multiple notes
    const matiereMap: Record<string, { notes: number[]; commentaires: string[] }> = {};
    for (const g of studentGrades) {
      if (!matiereMap[g.matiere]) matiereMap[g.matiere] = { notes: [], commentaires: [] };
      matiereMap[g.matiere].notes.push(Number(g.note));
      if (g.commentaire) matiereMap[g.matiere].commentaires.push(g.commentaire);
    }

    const lignes = MATIERES.map((m) => {
      const data = matiereMap[m];
      const note = data ? data.notes.reduce((a, b) => a + b, 0) / data.notes.length : 0;
      const coef = getCoef(student.classe, m);
      return {
        matiere: m,
        note: Math.round(note * 100) / 100,
        coefficient: coef,
        total: Math.round(note * coef * 100) / 100,
        commentaire: data?.commentaires.join("; ") || null,
      };
    }).filter((l) => {
      // Only show matieres that have grades or are relevant to this level
      const hasGrade = matiereMap[l.matiere];
      return hasGrade;
    });

    const totalPoints = lignes.reduce((s, l) => s + l.total, 0);
    const totalCoef = lignes.reduce((s, l) => s + l.coefficient, 0);
    const moyenne = totalCoef > 0 ? Math.round((totalPoints / totalCoef) * 100) / 100 : 0;

    setBulletin({ student, trimestre: filterTrimestre, lignes, totalPoints, totalCoef, moyenne });
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.student_id || !noteForm.note) return;
    const student = students.find((s) => s.id === noteForm.student_id);
    await addGrade({
      student_id: noteForm.student_id,
      matiere: noteForm.matiere,
      note: Number(noteForm.note),
      coefficient: student ? getCoef(student.classe, noteForm.matiere) : 1,
      trimestre: filterTrimestre,
      annee_scolaire: "2025-2026",
      commentaire: noteForm.commentaire || null,
    });
    setGrades(await getGrades());
    setShowNoteForm(false);
    setNoteForm({ student_id: "", matiere: MATIERES[0], note: "", commentaire: "" });
    if (selectedStudent) generateBulletin(selectedStudent);
  };

  const handlePrint = () => {
    if (!printRef.current || !bulletin) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Bulletin - ${bulletin.student.prenom} ${bulletin.student.nom}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:15px}
        th,td{border:1px solid #333;padding:6px 8px}
        th{background:#1e40af;color:#fff;text-align:center}
        td{text-align:center}
        td:first-child{text-align:left}
        h1{text-align:center;color:#1e40af;font-size:18px}
        h2{text-align:center;color:#333;font-size:14px}
        .header{text-align:center;border-bottom:2px solid #1e40af;padding-bottom:15px;margin-bottom:15px}
        .mention{font-size:16px;font-weight:bold;text-align:center;margin-top:15px;padding:10px;border:2px solid #1e40af;border-radius:8px}
        .footer{margin-top:30px;display:flex;justify-content:space-between}
        .sig{border-top:1px solid #333;padding-top:5px;width:200px;text-align:center;margin-top:40px}
        @media print{body{padding:15px}}
      </style></head><body>`);
    w.document.write(printRef.current.innerHTML);
    w.document.write("</body></html>");
    w.document.close();
    w.print();
  };

  const getMention = (m: number) => {
    if (m >= 16) return { text: "Tableau d'Honneur — Très Bien", color: "#15803d" };
    if (m >= 14) return { text: "Tableau d'Honneur — Bien", color: "#2563eb" };
    if (m >= 12) return { text: "Encouragements — Assez Bien", color: "#7c3aed" };
    if (m >= 10) return { text: "Passable", color: "#ca8a04" };
    return { text: "Insuffisant — Doit redoubler d'efforts", color: "#dc2626" };
  };

  const trimestreLabel = filterTrimestre === 1 ? "1er" : filterTrimestre === 2 ? "2ème" : "3ème";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold text-foreground">🎓 Bulletins Scolaires</h3>
        <button onClick={() => setShowNoteForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Saisir une note
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterTrimestre} onChange={(e) => { setFilterTrimestre(Number(e.target.value)); setBulletin(null); }} className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border">
          <option value={1}>1er Trimestre</option><option value={2}>2ème Trimestre</option><option value={3}>3ème Trimestre</option>
        </select>
        <select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border">
          <option value="all">Toutes les classes</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Student list */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-secondary text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Élève</th>
              <th className="text-left px-4 py-3 font-medium">Classe</th>
              <th className="text-center px-4 py-3 font-medium">Notes saisies</th>
              <th className="text-center px-4 py-3 font-medium">Action</th>
            </tr></thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucun élève</td></tr>
              ) : filteredStudents.map((s) => {
                const nbNotes = grades.filter((g) => g.student_id === s.id && g.trimestre === filterTrimestre).length;
                return (
                  <tr key={s.id} className={`border-t border-border hover:bg-secondary/50 ${selectedStudent === s.id ? "bg-primary/10" : ""}`}>
                    <td className="px-4 py-3 font-medium">{s.prenom} {s.nom}</td>
                    <td className="px-4 py-3">{s.classe}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${nbNotes > 0 ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>{nbNotes}</span></td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => generateBulletin(s.id)} className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                        <FileText className="w-3 h-3 inline mr-1" />Bulletin
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note form modal */}
      {showNoteForm && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Saisir une Note</h3><button onClick={() => setShowNoteForm(false)}><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleAddNote} className="space-y-3">
              <select value={noteForm.student_id} onChange={(e) => setNoteForm({ ...noteForm, student_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required>
                <option value="">Sélectionner un élève</option>
                {filteredStudents.map((s) => <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe})</option>)}
              </select>
              <select value={noteForm.matiere} onChange={(e) => setNoteForm({ ...noteForm, matiere: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                {MATIERES.map((m) => {
                  const student = students.find((s) => s.id === noteForm.student_id);
                  const coef = student ? getCoef(student.classe, m) : "?";
                  return <option key={m} value={m}>{m} (coef. {coef})</option>;
                })}
              </select>
              <input type="number" min="0" max="20" step="0.5" placeholder="Note /20" value={noteForm.note} onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <input placeholder="Commentaire (optionnel)" value={noteForm.commentaire} onChange={(e) => setNoteForm({ ...noteForm, commentaire: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <p className="text-xs text-muted-foreground">Trimestre : {trimestreLabel} — Coefficients du Congo appliqués automatiquement</p>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      {/* Bulletin display */}
      {bulletin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-foreground">Bulletin de {bulletin.student.prenom} {bulletin.student.nom} — {trimestreLabel} Trimestre</h4>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
              <Printer className="w-4 h-4" /> Imprimer
            </button>
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-secondary text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Matière</th>
                  <th className="text-center px-4 py-3 font-medium">Note /20</th>
                  <th className="text-center px-4 py-3 font-medium">Coefficient</th>
                  <th className="text-center px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium">Appréciation</th>
                </tr></thead>
                <tbody>
                  {bulletin.lignes.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucune note saisie pour ce trimestre</td></tr>
                  ) : bulletin.lignes.map((l) => (
                    <tr key={l.matiere} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{l.matiere}</td>
                      <td className="px-4 py-3 text-center"><span className={`font-bold ${l.note >= 10 ? "text-success" : "text-destructive"}`}>{l.note}</span></td>
                      <td className="px-4 py-3 text-center">{l.coefficient}</td>
                      <td className="px-4 py-3 text-center font-bold">{l.total}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{l.commentaire || "—"}</td>
                    </tr>
                  ))}
                  {bulletin.lignes.length > 0 && (
                    <>
                      <tr className="border-t-2 border-primary bg-secondary">
                        <td className="px-4 py-3 font-bold">Total</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-center font-bold">{bulletin.totalCoef}</td>
                        <td className="px-4 py-3 text-center font-bold">{bulletin.totalPoints}</td>
                        <td></td>
                      </tr>
                      <tr className="bg-primary/10">
                        <td colSpan={3} className="px-4 py-3 font-bold text-right">Moyenne Générale</td>
                        <td className="px-4 py-3 text-center font-bold text-lg" style={{ color: getMention(bulletin.moyenne).color }}>{bulletin.moyenne} /20</td>
                        <td className="px-4 py-3 font-bold text-xs" style={{ color: getMention(bulletin.moyenne).color }}>{getMention(bulletin.moyenne).text}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hidden print version */}
          <div className="hidden">
            <div ref={printRef}>
              <div className="header">
                <h1>EDUC 2.0 — BULLETIN SCOLAIRE</h1>
                <h2>{trimestreLabel} Trimestre — Année Scolaire 2025-2026</h2>
                <p style={{ marginTop: 10 }}>
                  <strong>Élève :</strong> {bulletin.student.prenom} {bulletin.student.nom} &nbsp;|&nbsp;
                  <strong>Classe :</strong> {bulletin.student.classe} &nbsp;|&nbsp;
                  <strong>Parent :</strong> {bulletin.student.contact_parent || "—"}
                </p>
              </div>
              <table>
                <thead><tr><th style={{ textAlign: "left" }}>Matière</th><th>Note /20</th><th>Coefficient</th><th>Total</th><th style={{ textAlign: "left" }}>Appréciation</th></tr></thead>
                <tbody>
                  {bulletin.lignes.map((l) => (
                    <tr key={l.matiere}>
                      <td style={{ textAlign: "left" }}>{l.matiere}</td>
                      <td>{l.note}</td>
                      <td>{l.coefficient}</td>
                      <td>{l.total}</td>
                      <td style={{ textAlign: "left" }}>{l.commentaire || "—"}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: "bold", background: "#e8edf5" }}>
                    <td style={{ textAlign: "left" }}>Total</td><td></td><td>{bulletin.totalCoef}</td><td>{bulletin.totalPoints}</td><td></td>
                  </tr>
                </tbody>
              </table>
              <div className="mention" style={{ color: getMention(bulletin.moyenne).color, textAlign: "center", marginTop: 15, padding: 10, border: "2px solid #1e40af", borderRadius: 8, fontSize: 16, fontWeight: "bold" }}>
                Moyenne Générale : {bulletin.moyenne} /20 — {getMention(bulletin.moyenne).text}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
                <div style={{ borderTop: "1px solid #333", paddingTop: 5, width: 200, textAlign: "center" }}>Le Directeur Général</div>
                <div style={{ borderTop: "1px solid #333", paddingTop: 5, width: 200, textAlign: "center" }}>Le Directeur des Études</div>
                <div style={{ borderTop: "1px solid #333", paddingTop: 5, width: 200, textAlign: "center" }}>Le Parent</div>
              </div>
              <p style={{ marginTop: 30, fontSize: 10, textAlign: "center", color: "#666" }}>Document généré par EDUC 2.0 — MAKETO NHOLLAND</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
