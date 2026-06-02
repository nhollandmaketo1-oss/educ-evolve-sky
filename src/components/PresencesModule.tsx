import { useState, useEffect } from "react";
import { getPersonnel, getAttendance, addAttendanceBulk, MATIERES, type Personnel, type Attendance } from "@/lib/store";
import { Clock } from "lucide-react";

export function PresencesModule() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMatiere, setSelectedMatiere] = useState("all");
  const [selectedHeure, setSelectedHeure] = useState("08:00");
  const [presenceState, setPresenceState] = useState<Record<string, { present: boolean; hours: number }>>({});

  useEffect(() => { getPersonnel().then(setPersonnel); getAttendance().then(setAttendance); }, []);

  const filteredPersonnel = selectedMatiere === "all" ? personnel : personnel.filter((p) => p.matiere === selectedMatiere);
  const heures = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  const handleMarkPresent = (personnelId: string) => {
    setPresenceState((prev) => ({
      ...prev,
      [personnelId]: prev[personnelId]?.present
        ? { present: false, hours: 0 }
        : { present: true, hours: prev[personnelId]?.hours || 1 },
    }));
  };

  const handleHoursChange = (personnelId: string, hours: number) => {
    setPresenceState((prev) => ({
      ...prev,
      [personnelId]: { present: true, hours: Math.max(0, hours) },
    }));
  };

  const handleSave = async () => {
    const records = Object.entries(presenceState).map(([personnel_id, { present, hours }]) => ({
      personnel_id, date: selectedDate, heure: selectedHeure, present, heures_effectuees: present ? hours : 0,
    }));
    if (records.length > 0) {
      await addAttendanceBulk(records);
      setAttendance(await getAttendance());
      setPresenceState({});
      alert("Présences enregistrées !");
    }
  };

  const getStatus = (personnelId: string): { present: boolean | undefined; hours: number } => {
    if (personnelId in presenceState) return { present: presenceState[personnelId].present, hours: presenceState[personnelId].hours };
    const record = attendance.find((a) => a.personnel_id === personnelId && a.date === selectedDate);
    return { present: record?.present, hours: Number(record?.heures_effectuees) || 0 };
  };

  // monthly aggregated hours
  const month = selectedDate.slice(0, 7);
  const monthlyHours = (id: string) =>
    attendance
      .filter((a) => a.personnel_id === id && a.present && a.date.startsWith(month))
      .reduce((s, a) => s + (Number(a.heures_effectuees) || 0), 0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Présences au Poste</h2>
      <div className="flex gap-3 flex-wrap">
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border" />
        <select value={selectedHeure} onChange={(e) => setSelectedHeure(e.target.value)} className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border">
          {heures.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select value={selectedMatiere} onChange={(e) => setSelectedMatiere(e.target.value)} className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border">
          <option value="all">Toutes les matières</option>
          {MATIERES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-secondary text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Nom</th>
              <th className="text-left px-4 py-3 font-medium">Matière</th>
              <th className="text-center px-4 py-3 font-medium">Présence</th>
              <th className="text-center px-4 py-3 font-medium">Heures</th>
              <th className="text-center px-4 py-3 font-medium" title="Total heures du mois en cours">Mois</th>
            </tr></thead>
            <tbody>
              {filteredPersonnel.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucun personnel</td></tr>
              ) : filteredPersonnel.map((p) => {
                const { present, hours } = getStatus(p.id);
                const totalMois = monthlyHours(p.id);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                    <td className="px-4 py-3 font-medium">{p.prenom} {p.nom}</td>
                    <td className="px-4 py-3">{p.matiere || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleMarkPresent(p.id)}
                        className={`w-20 py-1.5 rounded-full text-xs font-bold transition-colors ${present === true ? "bg-success text-success-foreground" : present === false ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>
                        {present === true ? "Présent" : present === false ? "Absent" : "—"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {present === true ? (
                        <input
                          type="number" min="0" max="24" step="0.5"
                          value={hours}
                          onChange={(e) => handleHoursChange(p.id, Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded-lg bg-input text-foreground border border-border text-center"
                          placeholder="h"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        <Clock className="w-3 h-3" /> {totalMois}h
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {Object.keys(presenceState).length > 0 && (
        <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">Enregistrer les présences</button>
      )}
    </div>
  );
}
