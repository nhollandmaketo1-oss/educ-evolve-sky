import { useState } from "react";
import { getStudents, getPayments, addPayment, type Payment } from "@/lib/store";
import { Plus, X } from "lucide-react";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export function PaiementsModule() {
  const [payments, setPayments] = useState<Payment[]>(getPayments());
  const students = getStudents();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentId: "", montant: "", mois: MOIS[0], status: "payé" as Payment["status"] });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.montant) return;
    addPayment({ studentId: form.studentId, montant: Number(form.montant), date: new Date().toISOString(), mois: form.mois, status: form.status });
    setPayments(getPayments());
    setShowForm(false);
    setForm({ studentId: "", montant: "", mois: MOIS[0], status: "payé" });
  };

  const getStudentName = (id: string) => {
    const s = students.find((st) => st.id === id);
    return s ? `${s.prenom} ${s.nom}` : "Inconnu";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Paiements Scolaires</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Enregistrer un paiement
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Nouveau Paiement</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required>
                <option value="">Sélectionner un élève</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe})</option>)}
              </select>
              <input type="number" placeholder="Montant (FCFA)" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <select value={form.mois} onChange={(e) => setForm({ ...form, mois: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                {MOIS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Payment["status"] })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                <option value="payé">Payé</option>
                <option value="impayé">Impayé</option>
                <option value="partiel">Partiel</option>
              </select>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Élève</th>
                <th className="text-left px-4 py-3 font-medium">Montant</th>
                <th className="text-left px-4 py-3 font-medium">Mois</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucun paiement enregistré</td></tr>
              ) : payments.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium">{getStudentName(p.studentId)}</td>
                  <td className="px-4 py-3">{p.montant.toLocaleString()} FCFA</td>
                  <td className="px-4 py-3">{p.mois}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      p.status === "payé" ? "bg-success/15 text-success" : p.status === "impayé" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                    }`}>{p.status}</span>
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
