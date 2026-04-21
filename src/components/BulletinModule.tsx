import { useState, useEffect } from "react";
import { getStudents, getGrades, addGrade, CLASSES, MATIERES, type Student, type Grade } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { useSchoolDisplayName } from "@/hooks/useSchoolName";
import { FileText, Printer, Plus, X, Download, BarChart3 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  return COEFFICIENTS_CONGO[getLevel(classe)]?.[matiere] || 1;
}

interface BulletinData {
  student: Student;
  trimestre: number;
  lignes: { matiere: string; note: number; coefficient: number; total: number; commentaire: string | null }[];
  totalPoints: number;
  totalCoef: number;
  moyenne: number;
}

interface ClassAvg {
  classe: string;
  nbEleves: number;
  moyenne: number;
  meilleur: number;
  pire: number;
  tauxReussite: number;
}

function getMention(m: number) {
  if (m >= 16) return { text: "Tableau d'Honneur - Tres Bien", color: "#15803d" };
  if (m >= 14) return { text: "Tableau d'Honneur - Bien", color: "#2563eb" };
  if (m >= 12) return { text: "Encouragements - Assez Bien", color: "#7c3aed" };
  if (m >= 10) return { text: "Passable", color: "#ca8a04" };
  return { text: "Insuffisant", color: "#dc2626" };
}

function computeStudentAverage(student: Student, grades: Grade[], trimestre: number): number | null {
  const sg = grades.filter((g) => g.student_id === student.id && g.trimestre === trimestre);
  if (sg.length === 0) return null;
  const matiereMap: Record<string, number[]> = {};
  for (const g of sg) {
    if (!matiereMap[g.matiere]) matiereMap[g.matiere] = [];
    matiereMap[g.matiere].push(Number(g.note));
  }
  let totalP = 0, totalC = 0;
  for (const [mat, notes] of Object.entries(matiereMap)) {
    const avg = notes.reduce((a, b) => a + b, 0) / notes.length;
    const coef = getCoef(student.classe, mat);
    totalP += avg * coef;
    totalC += coef;
  }
  return totalC > 0 ? Math.round((totalP / totalC) * 100) / 100 : null;
}

export function BulletinModule() {
  const { user } = useAuth();
  const schoolName = useSchoolDisplayName();
  const role = user?.role;
  const canCreate = role === "de"; // Only DE002 can create
  const canView = role === "dg" || role === "de" || role === "gestionnaire"; // DG, DE, GES can view

  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [filterClasse, setFilterClasse] = useState("all");
  const [filterTrimestre, setFilterTrimestre] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [bulletin, setBulletin] = useState<BulletinData | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showClassAvg, setShowClassAvg] = useState(false);
  const [noteForm, setNoteForm] = useState({ student_id: "", matiere: MATIERES[0], note: "", commentaire: "" });

  useEffect(() => { getStudents().then(setStudents); getGrades().then(setGrades); }, []);

  const filteredStudents = filterClasse === "all" ? students : students.filter((s) => s.classe === filterClasse);
  const trimestreLabel = filterTrimestre === 1 ? "1er" : filterTrimestre === 2 ? "2eme" : "3eme";

  // --- Class averages ---
  const classAverages: ClassAvg[] = CLASSES.map((classe) => {
    const classStudents = students.filter((s) => s.classe === classe);
    const moyennes = classStudents.map((s) => computeStudentAverage(s, grades, filterTrimestre)).filter((m): m is number => m !== null);
    if (moyennes.length === 0) return null;
    return {
      classe,
      nbEleves: moyennes.length,
      moyenne: Math.round((moyennes.reduce((a, b) => a + b, 0) / moyennes.length) * 100) / 100,
      meilleur: Math.max(...moyennes),
      pire: Math.min(...moyennes),
      tauxReussite: Math.round((moyennes.filter((m) => m >= 10).length / moyennes.length) * 100),
    };
  }).filter((c): c is ClassAvg => c !== null);

  // --- Generate bulletin ---
  const generateBulletin = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    setSelectedStudent(studentId);
    const studentGrades = grades.filter((g) => g.student_id === studentId && g.trimestre === filterTrimestre);
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
      return { matiere: m, note: Math.round(note * 100) / 100, coefficient: coef, total: Math.round(note * coef * 100) / 100, commentaire: data?.commentaires.join("; ") || null };
    }).filter((l) => matiereMap[l.matiere]);
    const totalPoints = lignes.reduce((s, l) => s + l.total, 0);
    const totalCoef = lignes.reduce((s, l) => s + l.coefficient, 0);
    const moyenne = totalCoef > 0 ? Math.round((totalPoints / totalCoef) * 100) / 100 : 0;
    setBulletin({ student, trimestre: filterTrimestre, lignes, totalPoints, totalCoef, moyenne });
  };

  // --- Add note (DE only) ---
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    if (!noteForm.student_id || !noteForm.note) return;
    const student = students.find((s) => s.id === noteForm.student_id);
    await addGrade({
      student_id: noteForm.student_id, matiere: noteForm.matiere,
      note: Number(noteForm.note), coefficient: student ? getCoef(student.classe, noteForm.matiere) : 1,
      trimestre: filterTrimestre, annee_scolaire: "2025-2026", commentaire: noteForm.commentaire || null,
    });
    setGrades(await getGrades());
    setShowNoteForm(false);
    setNoteForm({ student_id: "", matiere: MATIERES[0], note: "", commentaire: "" });
    if (selectedStudent) generateBulletin(selectedStudent);
  };

  // --- Export PDF ---
  const exportPDF = () => {
    if (!bulletin) return;
    const doc = new jsPDF();
    const { student, lignes, totalCoef, totalPoints, moyenne } = bulletin;
    const mention = getMention(moyenne);

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text(`${schoolName.toUpperCase()} - BULLETIN SCOLAIRE`, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);
    doc.text(`${trimestreLabel} Trimestre - Annee Scolaire 2025-2026`, 105, 28, { align: "center" });
    doc.setDrawColor(30, 64, 175);
    doc.line(20, 32, 190, 32);

    // Student info
    doc.setFontSize(10);
    doc.text(`Eleve : ${student.prenom} ${student.nom}`, 20, 40);
    doc.text(`Classe : ${student.classe}`, 120, 40);
    doc.text(`Parent : ${student.contact_parent || "-"}`, 20, 46);

    // Grades table
    autoTable(doc, {
      startY: 52,
      head: [["Matiere", "Note /20", "Coefficient", "Total", "Appreciation"]],
      body: [
        ...lignes.map((l) => [l.matiere, String(l.note), String(l.coefficient), String(l.total), l.commentaire || "-"]),
        [{ content: "Total", styles: { fontStyle: "bold" } }, "", String(totalCoef), String(Math.round(totalPoints * 100) / 100), ""],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 244, 255] },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 160;

    // Moyenne box
    doc.setFillColor(232, 237, 245);
    doc.roundedRect(20, finalY + 5, 170, 20, 3, 3, "F");
    doc.setFontSize(14);
    doc.setTextColor(mention.color === "#15803d" ? 21 : mention.color === "#2563eb" ? 37 : mention.color === "#7c3aed" ? 124 : mention.color === "#ca8a04" ? 202 : 220,
      mention.color === "#15803d" ? 128 : mention.color === "#2563eb" ? 99 : mention.color === "#7c3aed" ? 58 : mention.color === "#ca8a04" ? 138 : 38,
      mention.color === "#15803d" ? 61 : mention.color === "#2563eb" ? 175 : mention.color === "#7c3aed" ? 237 : mention.color === "#ca8a04" ? 4 : 38);
    doc.text(`Moyenne Generale : ${moyenne} /20 - ${mention.text}`, 105, finalY + 18, { align: "center" });

    // Signatures
    const sigY = finalY + 40;
    doc.setFontSize(9);
    doc.setTextColor(51, 51, 51);
    doc.line(20, sigY, 70, sigY);
    doc.text("Le Directeur General", 45, sigY + 5, { align: "center" });
    doc.line(80, sigY, 130, sigY);
    doc.text("Le Directeur des Etudes", 105, sigY + 5, { align: "center" });
    doc.line(140, sigY, 190, sigY);
    doc.text("Le Parent", 165, sigY + 5, { align: "center" });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(153, 153, 153);
    doc.text(`Document genere par ${schoolName} - EDUC 2.0`, 105, 285, { align: "center" });

    doc.save(`Bulletin_${student.prenom}_${student.nom}_T${bulletin.trimestre}.pdf`);
  };

  if (!canView) {
    return <div className="p-8 text-center text-muted-foreground">Vous n'avez pas accès aux bulletins scolaires.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold text-foreground">🎓 Bulletins Scolaires</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowClassAvg(!showClassAvg)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
            <BarChart3 className="w-4 h-4" /> Moyennes par classe
          </button>
          {canCreate && (
            <button onClick={() => setShowNoteForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> Saisir une note
            </button>
          )}
        </div>
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

      {/* Class averages recap */}
      {showClassAvg && (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 border-b border-border"><h4 className="font-bold text-foreground">📊 Récapitulatif des Moyennes par Classe — {trimestreLabel} Trimestre</h4></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-secondary text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Classe</th>
                <th className="text-center px-4 py-3 font-medium">Élèves notés</th>
                <th className="text-center px-4 py-3 font-medium">Moyenne classe</th>
                <th className="text-center px-4 py-3 font-medium">Meilleure</th>
                <th className="text-center px-4 py-3 font-medium">Plus basse</th>
                <th className="text-center px-4 py-3 font-medium">Taux réussite</th>
              </tr></thead>
              <tbody>
                {classAverages.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucune donnée pour ce trimestre</td></tr>
                ) : classAverages.map((c) => (
                  <tr key={c.classe} className="border-t border-border hover:bg-secondary/50">
                    <td className="px-4 py-3 font-bold">{c.classe}</td>
                    <td className="px-4 py-3 text-center">{c.nbEleves}</td>
                    <td className="px-4 py-3 text-center"><span className={`font-bold ${c.moyenne >= 10 ? "text-success" : "text-destructive"}`}>{c.moyenne} /20</span></td>
                    <td className="px-4 py-3 text-center text-success font-bold">{c.meilleur}</td>
                    <td className="px-4 py-3 text-center text-destructive font-bold">{c.pire}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${c.tauxReussite}%` }} /></div>
                        <span className="text-xs font-bold">{c.tauxReussite}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Note form modal — DE only */}
      {showNoteForm && canCreate && (
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="font-bold text-foreground">Bulletin de {bulletin.student.prenom} {bulletin.student.nom} — {trimestreLabel} Trimestre</h4>
            <div className="flex gap-2">
              <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                <Download className="w-4 h-4" /> Télécharger PDF
              </button>
            </div>
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
                        <td className="px-4 py-3 text-center font-bold">{Math.round(bulletin.totalPoints * 100) / 100}</td>
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
        </div>
      )}
    </div>
  );
}
