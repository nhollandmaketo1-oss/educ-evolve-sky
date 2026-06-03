import { useState, useEffect, useMemo } from "react";
import { getPersonnel, getAttendance, type Personnel, type Attendance } from "@/lib/store";
import { getAllUsers, getRoleLabel, type AppUser } from "@/lib/auth";
import { useSchoolDisplayName, useSchoolLogo } from "@/hooks/useSchoolName";
import { imageToDataUrl } from "@/lib/imageToDataUrl";
import { FileText, Clock, Download } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface PayPerson {
  id: string;
  fullName: string;
  role: string;
  salaire_base: number;
  hours: number;
  is_user?: boolean;
}

// Default monthly salary for admin users when none configured
const DEFAULT_USER_SALARIES: Record<string, number> = {
  dg: 350000,
  de: 250000,
  gestionnaire: 200000,
};

const HOURLY_RATES_KEY = "educ_hourly_rates_v1";
const loadRates = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(HOURLY_RATES_KEY) || "{}"); } catch { return {}; }
};
const saveRates = (r: Record<string, number>) => {
  try { localStorage.setItem(HOURLY_RATES_KEY, JSON.stringify(r)); } catch { /* */ }
};

export function SalairesModule() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [hourlyRates, setHourlyRates] = useState<Record<string, number>>(() => loadRates());
  const schoolName = useSchoolDisplayName();
  const schoolLogo = useSchoolLogo();

  useEffect(() => {
    getPersonnel().then(setPersonnel);
    getAttendance().then(setAttendance);
    getAllUsers().then(setUsers);
  }, []);

  const updateRate = (id: string, val: number) => {
    setHourlyRates((prev) => {
      const next = { ...prev, [id]: val };
      saveRates(next);
      return next;
    });
  };

  const monthlyHours = (personnelId: string) =>
    attendance
      .filter((a) => a.personnel_id === personnelId && a.present && a.date.startsWith(month))
      .reduce((s, a) => s + (Number(a.heures_effectuees) || 0), 0);

  const payList: PayPerson[] = useMemo(() => {
    const fromPersonnel: PayPerson[] = personnel.map((p) => ({
      id: p.id,
      fullName: `${p.prenom} ${p.nom}`,
      role: p.type,
      salaire_base: Number(p.salaire) || 0,
      hours: monthlyHours(p.id),
    }));
    const fromUsers: PayPerson[] = users.map((u) => ({
      id: u.id,
      fullName: u.display_name || u.username,
      role: getRoleLabel(u.role),
      salaire_base: DEFAULT_USER_SALARIES[u.role] || 0,
      hours: 0,
      is_user: true,
    }));
    return [...fromUsers, ...fromPersonnel];
  }, [personnel, users, attendance, month]);

  const totalMasse = payList.reduce((s, p) => s + p.salaire_base, 0);
  const totalHeures = payList.reduce((s, p) => s + p.hours, 0);

  const generateBulletin = async (person: PayPerson) => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();

    // Header
    if (schoolLogo) {
      try {
        const img = await imageToDataUrl(schoolLogo);
        if (img) pdf.addImage(img.dataUrl, img.format, 15, 12, 22, 22);
      } catch { /* */ }
    }
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(schoolName.toUpperCase(), pageW / 2, 20, { align: "center" });
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text("BULLETIN DE PAIEMENT", pageW / 2, 28, { align: "center" });
    pdf.setFontSize(9);
    pdf.text(`Mois : ${month}`, pageW / 2, 34, { align: "center" });

    pdf.setDrawColor(180);
    pdf.line(15, 40, pageW - 15, 40);

    // Identity
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Bénéficiaire", 15, 50);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Nom : ${person.fullName}`, 15, 58);
    pdf.text(`Fonction : ${person.role}`, 15, 64);
    pdf.text(`Référence : ${person.id.slice(0, 8).toUpperCase()}`, 15, 70);

    // Pay details
    const heuresLigne = person.hours > 0 ? person.hours : null;
    const tauxHoraire = hourlyRates[person.id] || 0;
    const partHoraire = heuresLigne ? heuresLigne * tauxHoraire : 0;
    const brut = person.salaire_base + partHoraire;
    const netLignes: [string, string][] = [
      ["Salaire de base", `${person.salaire_base.toLocaleString()} FCFA`],
    ];
    if (heuresLigne) {
      netLignes.push(["Heures effectuées", `${heuresLigne} h`]);
      netLignes.push(["Prix de l'heure", `${tauxHoraire.toLocaleString()} FCFA/h`]);
      netLignes.push(["Total heures", `${partHoraire.toLocaleString()} FCFA`]);
    }
    netLignes.push(["Net à payer", `${brut.toLocaleString()} FCFA`]);

    pdf.setFont("helvetica", "bold");
    pdf.text("Rémunération", 15, 84);
    let y = 92;
    pdf.setFontSize(10);
    netLignes.forEach(([k, v], i) => {
      const isLast = i === netLignes.length - 1;
      pdf.setFont("helvetica", isLast ? "bold" : "normal");
      pdf.setFillColor(isLast ? 230 : 245, isLast ? 240 : 245, 255);
      pdf.rect(15, y - 5, pageW - 30, 7, "F");
      pdf.text(k, 18, y);
      pdf.text(v, pageW - 18, y, { align: "right" });
      y += 8;
    });

    // Footer
    y += 20;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "italic");
    pdf.text(`Édité le ${new Date().toLocaleDateString("fr-FR")}`, 15, y);
    pdf.text("Signature du bénéficiaire", pageW - 15, y, { align: "right" });
    pdf.line(pageW - 80, y + 15, pageW - 15, y + 15);

    pdf.save(`bulletin-${person.fullName.replace(/\s+/g, "_")}-${month}.pdf`);
    toast.success(`Bulletin généré pour ${person.fullName}`);
  };

  const generateAll = async () => {
    for (const p of payList) {
      await generateBulletin(p);
    }
    toast.success(`${payList.length} bulletins générés`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Gestion des Salaires</h2>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border" />
          <button onClick={generateAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Download className="w-4 h-4" /> Générer tous les bulletins
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Bénéficiaires</p>
          <p className="text-2xl font-bold text-foreground">{payList.length}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Masse salariale</p>
          <p className="text-2xl font-bold text-foreground">{totalMasse.toLocaleString()} FCFA</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Total heures (mois)</p>
          <p className="text-2xl font-bold text-foreground">{totalHeures} h</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Salaire moyen</p>
          <p className="text-2xl font-bold text-foreground">{payList.length ? Math.round(totalMasse / payList.length).toLocaleString() : 0} FCFA</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-secondary text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Bénéficiaire</th>
              <th className="text-left px-4 py-3 font-medium">Fonction</th>
              <th className="text-left px-4 py-3 font-medium">Salaire de base</th>
              <th className="text-left px-4 py-3 font-medium">Heures effectuées</th>
              <th className="text-left px-4 py-3 font-medium">Prix / heure (FCFA)</th>
              <th className="text-right px-4 py-3 font-medium">Action</th>
            </tr></thead>
            <tbody>
              {payList.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun bénéficiaire</td></tr>
              ) : payList.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    {p.is_user && <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">ADMIN</span>}
                    {p.fullName}
                  </td>
                  <td className="px-4 py-3 capitalize">{p.role}</td>
                  <td className="px-4 py-3 font-semibold">{p.salaire_base.toLocaleString()} FCFA</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <Clock className="w-3 h-3" /> {p.hours} h
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min={0} step={100}
                      value={hourlyRates[p.id] ?? ""}
                      onChange={(e) => updateRate(p.id, Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-28 px-2 py-1.5 rounded-lg bg-input text-foreground text-xs border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => generateBulletin(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20">
                      <FileText className="w-3.5 h-3.5" /> Générer bulletin
                    </button>
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
