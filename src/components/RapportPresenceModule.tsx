import { useState, useEffect, useRef } from "react";
import { getPersonnel, getAttendance, MATIERES, type Personnel, type Attendance } from "@/lib/store";
import { FileText, Printer } from "lucide-react";

interface TeacherReport {
  personnel: Personnel;
  totalPresent: number;
  totalAbsent: number;
  heuresEffectuees: number;
  prixHeure: number;
}

export function RapportPresenceModule() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [dateDebut, setDateDebut] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateFin, setDateFin] = useState(() => new Date().toISOString().split("T")[0]);
  const [reports, setReports] = useState<TeacherReport[]>([]);
  const [generated, setGenerated] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getPersonnel().then(setPersonnel); getAttendance().then(setAttendance); }, []);

  const generateReport = () => {
    const filtered = attendance.filter((a) => a.date >= dateDebut && a.date <= dateFin);
    const reps: TeacherReport[] = personnel
      .filter((p) => p.type === "enseignant")
      .map((p) => {
        const records = filtered.filter((a) => a.personnel_id === p.id);
        const totalPresent = records.filter((r) => r.present).length;
        const totalAbsent = records.filter((r) => !r.present).length;
        return { personnel: p, totalPresent, totalAbsent, heuresEffectuees: totalPresent * 2, prixHeure: 0 };
      });
    setReports(reps);
    setGenerated(true);
  };

  const updateField = (idx: number, field: "heuresEffectuees" | "prixHeure", value: number) => {
    setReports((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Rapport de Présence</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #333;padding:6px 8px;text-align:left}
        th{background:#2563eb;color:#fff}
        h1{text-align:center;color:#1e40af}
        .header{text-align:center;margin-bottom:20px}
        .total{font-weight:bold;background:#f0f4ff}
        @media print{body{padding:0}}
      </style></head><body>`);
    w.document.write(printRef.current.innerHTML);
    w.document.write("</body></html>");
    w.document.close();
    w.print();
  };

  const totalMontant = reports.reduce((s, r) => s + r.heuresEffectuees * r.prixHeure, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">📋 Rapport de Présence au Poste</h3>
      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-xs text-muted-foreground">Date début</label>
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="block px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Date fin</label>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="block px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border" />
        </div>
        <button onClick={generateReport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <FileText className="w-4 h-4" /> Générer
        </button>
        {generated && (
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
            <Printer className="w-4 h-4" /> Imprimer
          </button>
        )}
      </div>

      {generated && (
        <>
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Enseignant</th>
                    <th className="text-left px-4 py-3 font-medium">Matière</th>
                    <th className="text-center px-4 py-3 font-medium">Présences</th>
                    <th className="text-center px-4 py-3 font-medium">Absences</th>
                    <th className="text-center px-4 py-3 font-medium">Heures effectuées</th>
                    <th className="text-center px-4 py-3 font-medium">Prix/heure (FCFA)</th>
                    <th className="text-center px-4 py-3 font-medium">Montant (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Aucun enseignant trouvé</td></tr>
                  ) : reports.map((r, idx) => (
                    <tr key={r.personnel.id} className="border-t border-border hover:bg-secondary/50">
                      <td className="px-4 py-3 font-medium">{r.personnel.prenom} {r.personnel.nom}</td>
                      <td className="px-4 py-3">{r.personnel.matiere || "—"}</td>
                      <td className="px-4 py-3 text-center text-success font-bold">{r.totalPresent}</td>
                      <td className="px-4 py-3 text-center text-destructive font-bold">{r.totalAbsent}</td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" min="0" value={r.heuresEffectuees} onChange={(e) => updateField(idx, "heuresEffectuees", Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded-lg bg-input text-foreground border border-border text-center text-sm" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" min="0" value={r.prixHeure} onChange={(e) => updateField(idx, "prixHeure", Number(e.target.value))}
                          className="w-24 px-2 py-1 rounded-lg bg-input text-foreground border border-border text-center text-sm" />
                      </td>
                      <td className="px-4 py-3 text-center font-bold">{(r.heuresEffectuees * r.prixHeure).toLocaleString()}</td>
                    </tr>
                  ))}
                  {reports.length > 0 && (
                    <tr className="border-t-2 border-primary bg-secondary">
                      <td colSpan={6} className="px-4 py-3 font-bold text-right">Total général</td>
                      <td className="px-4 py-3 text-center font-bold text-primary">{totalMontant.toLocaleString()} FCFA</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hidden print version */}
          <div className="hidden">
            <div ref={printRef}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <h1 style={{ color: "#1e40af" }}>EDUC 2.0 — Rapport de Présence au Poste</h1>
                <p>Période : {dateDebut} au {dateFin}</p>
              </div>
              <table>
                <thead>
                  <tr><th>Enseignant</th><th>Matière</th><th>Présences</th><th>Absences</th><th>Heures</th><th>Prix/h</th><th>Montant</th></tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.personnel.id}>
                      <td>{r.personnel.prenom} {r.personnel.nom}</td>
                      <td>{r.personnel.matiere || "—"}</td>
                      <td style={{ textAlign: "center" }}>{r.totalPresent}</td>
                      <td style={{ textAlign: "center" }}>{r.totalAbsent}</td>
                      <td style={{ textAlign: "center" }}>{r.heuresEffectuees}</td>
                      <td style={{ textAlign: "center" }}>{r.prixHeure.toLocaleString()}</td>
                      <td style={{ textAlign: "center" }}>{(r.heuresEffectuees * r.prixHeure).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="total">
                    <td colSpan={6} style={{ textAlign: "right", fontWeight: "bold" }}>Total général</td>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{totalMontant.toLocaleString()} FCFA</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ marginTop: 30, fontSize: 10, textAlign: "center", color: "#666" }}>Document généré par EDUC 2.0 — MAKETO NHOLLAND</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
