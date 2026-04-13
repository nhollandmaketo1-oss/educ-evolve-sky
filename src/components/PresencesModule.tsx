import { useState } from "react";
import { getPersonnel, getAttendance, setAttendanceBulk, MATIERES } from "@/lib/store";

export function PresencesModule() {
  const personnel = getPersonnel();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMatiere, setSelectedMatiere] = useState("all");
  const [selectedHeure, setSelectedHeure] = useState("08:00");
  const [presenceState, setPresenceState] = useState<Record<string, boolean>>({});
  const attendance = getAttendance();

  const filteredPersonnel = selectedMatiere === "all"
    ? personnel
    : personnel.filter((p) => p.matiere === selectedMatiere);

  const handleToggle = (personnelId: string) => {
    setPresenceState((prev) => ({ ...prev, [personnelId]: !prev[personnelId] }));
  };

  const handleSave = () => {
    const records = Object.entries(presenceState).map(([personnelId, present]) => ({
      personnelId,
      date: selectedDate,
      heure: selectedHeure,
      present,
    }));
    if (records.length > 0) {
      setAttendanceBulk(records);
      setPresenceState({});
      alert("Présences enregistrées !");
    }
  };

  const heures = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  // Check past attendance for a person on the selected date
  const getStatus = (personnelId: string) => {
    if (personnelId in presenceState) return presenceState[personnelId];
    const record = attendance.find((a) => a.personnelId === personnelId && a.date === selectedDate);
    return record?.present;
  };

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
            <thead>
              <tr className="bg-secondary text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Nom</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Matière</th>
                <th className="text-left px-4 py-3 font-medium">Heure</th>
                <th className="text-center px-4 py-3 font-medium">Présence</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersonnel.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucun personnel</td></tr>
              ) : filteredPersonnel.map((p) => {
                const status = getStatus(p.id);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                    <td className="px-4 py-3 font-medium">{p.prenom} {p.nom}</td>
                    <td className="px-4 py-3">{p.type}</td>
                    <td className="px-4 py-3">{p.matiere || "—"}</td>
                    <td className="px-4 py-3">{selectedHeure}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(p.id)}
                        className={`w-20 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          status === true
                            ? "bg-success text-success-foreground"
                            : status === false
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {status === true ? "Présent" : status === false ? "Absent" : "—"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {Object.keys(presenceState).length > 0 && (
        <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">
          Enregistrer les présences
        </button>
      )}
    </div>
  );
}
