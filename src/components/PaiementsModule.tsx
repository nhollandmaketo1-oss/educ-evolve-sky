import { useState, useEffect, useMemo } from "react";
import {
  getStudents, getPayments, addPayment, updatePayment, deletePayment,
  getNotifications, addNotification,
  type Payment, type Student,
} from "@/lib/store";
import { Plus, X, Pencil, Trash2, CheckCircle2, AlertCircle, Filter, Wallet } from "lucide-react";
import { toast } from "sonner";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Index of current month (0-based). A month is "terminé" when current date > last day.
function isMonthOver(monthIndex: number, year: number) {
  const now = new Date();
  // last day of given month
  const lastDay = new Date(year, monthIndex + 1, 0, 23, 59, 59);
  return now > lastDay;
}

export function PaiementsModule() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState({
    student_id: "",
    montant: "",
    mois: MOIS[new Date().getMonth()],
    status: "payé" as Payment["status"],
  });
  const [filterMois, setFilterMois] = useState<string>(MOIS[new Date().getMonth()]);
  const [filterClasse, setFilterClasse] = useState<string>("all");
  const year = new Date().getFullYear();

  const reload = async () => {
    const [p, s] = await Promise.all([getPayments(), getStudents()]);
    setPayments(p);
    setStudents(s);
  };

  useEffect(() => { reload(); }, []);

  // Auto-notify DG of late payers when a month is over (deduplicated by message)
  useEffect(() => {
    if (students.length === 0) return;
    const today = new Date();
    const currentYear = today.getFullYear();
    // Check the most recently completed month
    const lastCompletedIdx = today.getMonth() - 1; // can be -1 if January
    if (lastCompletedIdx < 0) return;
    const moisName = MOIS[lastCompletedIdx];
    const lateStudents = students.filter((s) => {
      if (Number(s.frais_scolaire || 0) <= 0) return false;
      const paid = payments.find(
        (p) => p.student_id === s.id && p.mois === moisName && (p.status === "payé" || p.status === "partiel"),
      );
      return !paid;
    });
    if (lateStudents.length === 0) return;
    const tag = `[RETARD-${moisName}-${currentYear}]`;
    (async () => {
      const existing = await getNotifications();
      if (existing.some((n) => n.message.startsWith(tag))) return;
      const list = lateStudents
        .slice(0, 30)
        .map((s) => `${s.prenom} ${s.nom} (${s.classe})`)
        .join(", ");
      const more = lateStudents.length > 30 ? ` +${lateStudents.length - 30} autres` : "";
      await addNotification({
        message: `${tag} ${lateStudents.length} élève(s) n'ont pas payé les frais de ${moisName} ${currentYear} : ${list}${more}`,
        target_role: "dg",
        read: false,
      });
    })();
  }, [students, payments]);

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.classe))).sort(),
    [students],
  );

  const resetForm = () => {
    setForm({ student_id: "", montant: "", mois: MOIS[new Date().getMonth()], status: "payé" });
    setEditPayment(null);
    setShowForm(false);
  };

  const openAdd = (studentId?: string, defaultMois?: string) => {
    const s = studentId ? students.find((st) => st.id === studentId) : null;
    setEditPayment(null);
    setForm({
      student_id: studentId || "",
      montant: s?.frais_scolaire ? String(s.frais_scolaire) : "",
      mois: defaultMois || MOIS[new Date().getMonth()],
      status: "payé",
    });
    setShowForm(true);
  };

  const openEdit = (p: Payment) => {
    setEditPayment(p);
    setForm({
      student_id: p.student_id,
      montant: String(p.montant),
      mois: p.mois,
      status: p.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id || !form.montant) return;
    if (editPayment) {
      await updatePayment(editPayment.id, {
        student_id: form.student_id,
        montant: Number(form.montant),
        mois: form.mois,
        status: form.status,
      });
    } else {
      await addPayment({
        student_id: form.student_id,
        montant: Number(form.montant),
        date: new Date().toISOString(),
        mois: form.mois,
        status: form.status,
      });
    }
    await reload();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce paiement ?")) return;
    await deletePayment(id);
    await reload();
  };

  const handleBulkCollect = async () => {
    if (filterClasse === "all") {
      toast.error("Sélectionnez d'abord une classe spécifique");
      return;
    }
    const targets = filteredStudents.filter((s) => {
      const already = payments.find((p) => p.student_id === s.id && p.mois === filterMois);
      return !already && Number(s.frais_scolaire || 0) > 0;
    });
    if (targets.length === 0) {
      toast.info("Aucun élève à encaisser pour ce mois (déjà payés ou frais non défini)");
      return;
    }
    if (!confirm(`Encaisser ${targets.length} paiement(s) pour la classe ${filterClasse} — mois de ${filterMois} ?`)) return;
    const nowIso = new Date().toISOString();
    await Promise.all(
      targets.map((s) =>
        addPayment({
          student_id: s.id,
          montant: Number(s.frais_scolaire),
          date: nowIso,
          mois: filterMois,
          status: "payé",
        })
      )
    );
    await reload();
    toast.success(`${targets.length} paiement(s) enregistré(s) pour ${filterClasse}`);
  };

  // Build per-student status for the selected month
  const monthIndex = MOIS.indexOf(filterMois);
  const monthOver = isMonthOver(monthIndex, year);

  const filteredStudents = filterClasse === "all"
    ? students
    : students.filter((s) => s.classe === filterClasse);

  type Row = {
    student: Student;
    payment: Payment | null;
    state: "paid" | "partial" | "unpaid_over" | "unpaid_pending";
  };

  const rows: Row[] = filteredStudents.map((student) => {
    const payment = payments.find(
      (p) => p.student_id === student.id && p.mois === filterMois,
    ) || null;
    let state: Row["state"];
    if (payment?.status === "payé") state = "paid";
    else if (payment?.status === "partiel") state = "partial";
    else if (monthOver) state = "unpaid_over";
    else state = "unpaid_pending";
    return { student, payment, state };
  });

  const stats = {
    paid: rows.filter((r) => r.state === "paid").length,
    partial: rows.filter((r) => r.state === "partial").length,
    unpaidOver: rows.filter((r) => r.state === "unpaid_over").length,
    pending: rows.filter((r) => r.state === "unpaid_pending").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">
          Paiements Frais Scolaires
        </h2>
        <button
          onClick={() => openAdd()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Enregistrer un paiement
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" /> Filtrer :
        </div>
        <select
          value={filterMois}
          onChange={(e) => setFilterMois(e.target.value)}
          className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border"
        >
          {MOIS.map((m) => <option key={m} value={m}>{m} {year}</option>)}
        </select>
        <select
          value={filterClasse}
          onChange={(e) => setFilterClasse(e.target.value)}
          className="px-3 py-2 rounded-xl bg-input text-foreground text-sm border border-border"
        >
          <option value="all">Toutes les classes</option>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {monthOver && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-warning/15 text-warning font-semibold">
            Mois terminé
          </span>
        )}
        <button
          onClick={handleBulkCollect}
          disabled={filterClasse === "all"}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-success text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          title={filterClasse === "all" ? "Sélectionnez une classe" : `Encaisser tous les frais de ${filterClasse} pour ${filterMois}`}
        >
          <Wallet className="w-4 h-4" /> Encaisser tous les frais du mois
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="text-xs text-muted-foreground">Payés</div>
          <div className="text-2xl font-bold text-success">{stats.paid}</div>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="text-xs text-muted-foreground">Partiels</div>
          <div className="text-2xl font-bold text-warning">{stats.partial}</div>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="text-xs text-muted-foreground">En retard</div>
          <div className="text-2xl font-bold text-destructive">{stats.unpaidOver}</div>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="text-xs text-muted-foreground">En attente</div>
          <div className="text-2xl font-bold text-muted-foreground">{stats.pending}</div>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">
                {editPayment ? "Modifier le paiement" : "Nouveau Paiement"}
              </h3>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <select
                value={form.student_id}
                onChange={(e) => {
                  const s = students.find((st) => st.id === e.target.value);
                  setForm({
                    ...form,
                    student_id: e.target.value,
                    montant: form.montant || (s?.frais_scolaire ? String(s.frais_scolaire) : ""),
                  });
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border"
                required
              >
                <option value="">Sélectionner un élève</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.prenom} {s.nom} ({s.classe})
                    {s.frais_scolaire ? ` — ${Number(s.frais_scolaire).toLocaleString()} FCFA/mois` : ""}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Montant (FCFA)"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border"
                required
              />
              <select
                value={form.mois}
                onChange={(e) => setForm({ ...form, mois: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border"
              >
                {MOIS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Payment["status"] })}
                className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border"
              >
                <option value="payé">Payé</option>
                <option value="partiel">Partiel</option>
                <option value="impayé">Impayé</option>
              </select>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90"
              >
                {editPayment ? "Modifier" : "Enregistrer"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Per-student status for the selected month */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-sm">
            État des paiements — {filterMois} {year}
          </h3>
          <span className="text-xs text-muted-foreground">
            {rows.length} élève(s)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Élève</th>
                <th className="text-left px-4 py-3 font-medium">Classe</th>
                <th className="text-left px-4 py-3 font-medium">Frais dû</th>
                <th className="text-left px-4 py-3 font-medium">Montant payé</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun élève
                  </td>
                </tr>
              ) : rows.map(({ student, payment, state }) => {
                const nameClass =
                  state === "paid" ? "text-success" :
                  state === "partial" ? "text-warning" :
                  state === "unpaid_over" ? "text-destructive" :
                  "text-foreground";
                const badge =
                  state === "paid" ? { label: "Payé", cls: "bg-success/15 text-success" } :
                  state === "partial" ? { label: "Partiel", cls: "bg-warning/15 text-warning" } :
                  state === "unpaid_over" ? { label: "Non payé (en retard)", cls: "bg-destructive/15 text-destructive" } :
                  { label: "En attente", cls: "bg-muted text-muted-foreground" };
                return (
                  <tr key={student.id} className="border-t border-border hover:bg-secondary/50">
                    <td className={`px-4 py-3 font-semibold ${nameClass}`}>
                      <div className="flex items-center gap-2">
                        {state === "paid" && <CheckCircle2 className="w-4 h-4" />}
                        {state === "unpaid_over" && <AlertCircle className="w-4 h-4" />}
                        {student.prenom} {student.nom}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{student.classe}</td>
                    <td className="px-4 py-3">
                      {Number(student.frais_scolaire || 0).toLocaleString()} FCFA
                    </td>
                    <td className="px-4 py-3">
                      {payment ? `${Number(payment.montant).toLocaleString()} FCFA` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {payment ? (
                          <>
                            <button
                              onClick={() => openEdit(payment)}
                              className="p-1.5 rounded-lg hover:bg-secondary"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleDelete(payment.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openAdd(student.id, filterMois)}
                            className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
                          >
                            Encaisser
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* History */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Historique des paiements</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Élève</th>
                <th className="text-left px-4 py-3 font-medium">Montant</th>
                <th className="text-left px-4 py-3 font-medium">Mois</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun paiement</td></tr>
              ) : payments.map((p) => {
                const s = students.find((st) => st.id === p.student_id);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                    <td className="px-4 py-3 font-medium">{s ? `${s.prenom} ${s.nom}` : "Inconnu"}</td>
                    <td className="px-4 py-3">{Number(p.montant).toLocaleString()} FCFA</td>
                    <td className="px-4 py-3">{p.mois}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.status === "payé" ? "bg-success/15 text-success" : p.status === "impayé" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary" title="Modifier">
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10" title="Supprimer">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
