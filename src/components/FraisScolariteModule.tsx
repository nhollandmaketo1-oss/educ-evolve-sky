import { useEffect, useMemo, useState } from "react";
import { CLASSES, getStudents, type Student } from "@/lib/store";
import {
  getClassFees, upsertClassFee, deleteClassFee,
  getInvoices, addInvoice, updateInvoice, deleteInvoice,
  generateMonthlyInvoices, SCHOOL_MONTHS,
  type ClassFee, type Invoice,
} from "@/lib/feesStore";
import { Plus, Trash2, Pencil, Download, Printer, Wand2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useSchoolDisplayName } from "@/hooks/useSchoolName";

const STATUT_LABEL: Record<string, string> = { emise: "Émise", payee: "Payée", annulee: "Annulée" };

function currentSchoolYear(): number {
  const d = new Date();
  return d.getMonth() + 1 >= 10 ? d.getFullYear() : d.getFullYear() - 1;
}

export function FraisScolariteModule() {
  const schoolName = useSchoolDisplayName();
  const [tab, setTab] = useState<"tarifs" | "factures">("tarifs");
  const [fees, setFees] = useState<ClassFee[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeForm, setFeeForm] = useState<Omit<ClassFee, "id">>({ classe: CLASSES[0], frais_inscription: 0, frais_mensuel: 0, mois_count: 9, devise: "FCFA" });
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [genMonth, setGenMonth] = useState<string>(`${currentSchoolYear()}-10`);
  const [genClasse, setGenClasse] = useState<string>("");
  const [filter, setFilter] = useState({ q: "", classe: "", mois: "", statut: "" });
  const [showInvForm, setShowInvForm] = useState(false);
  const [invForm, setInvForm] = useState<{ student_id: string; type_frais: string; mois: string; montant: string; notes: string }>({
    student_id: "", type_frais: "mensuel", mois: `${currentSchoolYear()}-10`, montant: "", notes: "",
  });

  const reload = async () => {
    setFees(await getClassFees());
    setInvoices(await getInvoices());
    setStudents(await getStudents());
  };
  useEffect(() => { reload(); }, []);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const filteredInv = useMemo(() => invoices.filter((i) => {
    if (filter.classe && i.classe !== filter.classe) return false;
    if (filter.mois && i.mois !== filter.mois) return false;
    if (filter.statut && i.statut !== filter.statut) return false;
    if (filter.q) {
      const s = studentMap.get(i.student_id);
      const label = `${i.numero} ${s ? s.prenom + " " + s.nom : ""}`.toLowerCase();
      if (!label.includes(filter.q.toLowerCase())) return false;
    }
    return true;
  }), [invoices, filter, studentMap]);

  const totalEmise = filteredInv.reduce((s, i) => s + Number(i.montant), 0);
  const totalPayee = filteredInv.filter((i) => i.statut === "payee").reduce((s, i) => s + Number(i.montant), 0);

  // ─── Tarifs ───
  const submitFee = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertClassFee({ ...feeForm, frais_inscription: Number(feeForm.frais_inscription), frais_mensuel: Number(feeForm.frais_mensuel), mois_count: Number(feeForm.mois_count) });
    toast.success("Tarif enregistré");
    setShowFeeForm(false);
    reload();
  };
  const editFee = (f: ClassFee) => {
    setFeeForm({ classe: f.classe, frais_inscription: Number(f.frais_inscription), frais_mensuel: Number(f.frais_mensuel), mois_count: f.mois_count, devise: f.devise });
    setShowFeeForm(true);
  };

  // ─── Factures ───
  const genInvoices = async () => {
    const n = await generateMonthlyInvoices(genMonth, genClasse || undefined);
    if (n > 0) { toast.success(`${n} facture(s) générée(s)`); reload(); }
    else toast.info("Aucune nouvelle facture (déjà générée ou tarif manquant)");
  };

  const submitInv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.student_id) { toast.error("Sélectionner un élève"); return; }
    const s = studentMap.get(invForm.student_id);
    if (!s) return;
    await addInvoice({
      student_id: s.id, classe: s.classe,
      mois: invForm.type_frais === "mensuel" ? invForm.mois : null,
      type_frais: invForm.type_frais, montant: Number(invForm.montant) || 0,
      date_emission: new Date().toISOString().slice(0, 10),
      date_echeance: invForm.type_frais === "mensuel"
        ? `${invForm.mois}-02`
        : null,
      statut: "emise", notes: invForm.notes || null,
    });
    toast.success("Facture créée");
    setShowInvForm(false);
    setInvForm({ student_id: "", type_frais: "mensuel", mois: `${currentSchoolYear()}-10`, montant: "", notes: "" });
    reload();
  };

  const togglePaid = async (i: Invoice) => {
    await updateInvoice(i.id, { statut: i.statut === "payee" ? "emise" : "payee" });
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette facture ?")) return;
    await deleteInvoice(id); reload();
  };

  const exportCsv = () => {
    const rows = [
      ["N°", "Date", "Élève", "Classe", "Mois", "Type", "Montant", "Échéance", "Statut", "Notes"],
      ...filteredInv.map((i) => {
        const s = studentMap.get(i.student_id);
        return [
          i.numero, i.date_emission, s ? `${s.prenom} ${s.nom}` : i.student_id,
          i.classe, i.mois || "-", i.type_frais, String(i.montant),
          i.date_echeance || "-", STATUT_LABEL[i.statut] || i.statut, i.notes || "",
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `factures-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const printInvoice = (i: Invoice) => {
    const s = studentMap.get(i.student_id);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${i.numero}</title>
      <style>body{font-family:system-ui,sans-serif;padding:32px;color:#111}
      h1{color:#1e40af;margin:0 0 4px}.muted{color:#666;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      th,td{border:1px solid #ddd;padding:10px;text-align:left;font-size:14px}
      th{background:#eff6ff;color:#1e3a8a}.total{background:#f0f9ff;font-weight:700}
      .box{border:1px solid #ddd;border-radius:8px;padding:12px;margin-top:16px}
      .row{display:flex;justify-content:space-between;gap:24px}</style></head><body>
      <div class="row"><div><h1>${schoolName}</h1><div class="muted">Facture scolaire</div></div>
      <div style="text-align:right"><strong>N° ${i.numero}</strong><br/><span class="muted">Émise le ${i.date_emission}</span></div></div>
      <div class="box"><strong>Élève :</strong> ${s ? `${s.prenom} ${s.nom}` : i.student_id}<br/>
      <strong>Classe :</strong> ${i.classe}<br/>
      <strong>Parent :</strong> ${s?.contact_parent || "-"}</div>
      <table><thead><tr><th>Désignation</th><th>Période</th><th style="text-align:right">Montant (FCFA)</th></tr></thead>
      <tbody><tr><td>${i.type_frais === "mensuel" ? "Frais de scolarité" : i.type_frais === "inscription" ? "Frais d'inscription" : "Frais divers"}</td>
      <td>${i.mois || "-"}</td><td style="text-align:right">${Number(i.montant).toLocaleString("fr-FR")}</td></tr>
      <tr class="total"><td colspan="2">TOTAL À PAYER</td><td style="text-align:right">${Number(i.montant).toLocaleString("fr-FR")} FCFA</td></tr></tbody></table>
      <p class="muted" style="margin-top:24px">Échéance : <strong>${i.date_echeance || "-"}</strong> — Statut : <strong>${STATUT_LABEL[i.statut] || i.statut}</strong></p>
      ${i.notes ? `<p class="muted">Notes : ${i.notes}</p>` : ""}
      <p class="muted" style="margin-top:48px">Document généré par EDUC 2.0.</p>
      <script>window.onload=()=>{window.print();}</script></body></html>`;
    const w = window.open("", "_blank"); if (!w) { toast.error("Popup bloqué"); return; }
    w.document.write(html); w.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTab("tarifs")} className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === "tarifs" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Tarifs par classe</button>
        <button onClick={() => setTab("factures")} className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === "factures" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Factures</button>
      </div>

      {tab === "tarifs" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Définissez les frais d'inscription et le mensuel pour chaque classe.</p>
            <button onClick={() => { setFeeForm({ classe: CLASSES[0], frais_inscription: 0, frais_mensuel: 0, mois_count: 9, devise: "FCFA" }); setShowFeeForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              <Plus className="w-4 h-4" /> Nouveau tarif
            </button>
          </div>
          <div className="bg-card rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left px-3 py-2">Classe</th><th className="text-right px-3 py-2">Inscription</th>
                  <th className="text-right px-3 py-2">Mensuel</th><th className="text-center px-3 py-2">Mois</th>
                  <th className="text-right px-3 py-2">Total annuel</th><th></th></tr>
              </thead>
              <tbody>
                {fees.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Aucun tarif configuré</td></tr>}
                {fees.map((f) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{f.classe}</td>
                    <td className="px-3 py-2 text-right">{Number(f.frais_inscription).toLocaleString("fr-FR")}</td>
                    <td className="px-3 py-2 text-right">{Number(f.frais_mensuel).toLocaleString("fr-FR")}</td>
                    <td className="px-3 py-2 text-center">{f.mois_count}</td>
                    <td className="px-3 py-2 text-right font-semibold">{(Number(f.frais_inscription) + Number(f.frais_mensuel) * f.mois_count).toLocaleString("fr-FR")} {f.devise}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => editFee(f)} className="p-1.5 rounded-lg hover:bg-secondary"><Pencil className="w-4 h-4" /></button>
                      <button onClick={async () => { if (confirm("Supprimer ?")) { await deleteClassFee(f.id); reload(); } }} className="p-1.5 rounded-lg hover:bg-secondary text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "factures" && (
        <div className="space-y-3">
          {/* Actions */}
          <div className="bg-card rounded-2xl border border-border p-3 flex flex-wrap gap-2 items-end">
            <label className="text-xs flex-1 min-w-[130px]">Mois à facturer
              <select value={genMonth} onChange={(e) => setGenMonth(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm">
                {SCHOOL_MONTHS.map((m) => {
                  const year = ["10", "11", "12"].includes(m.key) ? currentSchoolYear() : currentSchoolYear() + 1;
                  const val = `${year}-${m.key}`;
                  return <option key={val} value={val}>{m.label} {year}</option>;
                })}
              </select>
            </label>
            <label className="text-xs flex-1 min-w-[130px]">Classe (optionnel)
              <select value={genClasse} onChange={(e) => setGenClasse(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm">
                <option value="">Toutes</option>
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <button onClick={genInvoices} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              <Wand2 className="w-4 h-4" /> Générer factures
            </button>
            <button onClick={() => setShowInvForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-sm font-medium">
              <Plus className="w-4 h-4" /> Manuelle
            </button>
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-sm font-medium">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-2xl border border-border p-3"><p className="text-xs text-muted-foreground">Factures</p><p className="text-xl font-bold">{filteredInv.length}</p></div>
            <div className="bg-card rounded-2xl border border-border p-3"><p className="text-xs text-muted-foreground">Émis</p><p className="text-xl font-bold">{totalEmise.toLocaleString("fr-FR")}</p></div>
            <div className="bg-card rounded-2xl border border-border p-3"><p className="text-xs text-muted-foreground">Payé</p><p className="text-xl font-bold text-primary">{totalPayee.toLocaleString("fr-FR")}</p></div>
          </div>

          {/* Filtres */}
          <div className="bg-card rounded-2xl border border-border p-3 flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5 flex-1 min-w-[160px]"><Search className="w-4 h-4 text-muted-foreground" />
              <input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} placeholder="N° ou nom..." className="flex-1 bg-transparent outline-none text-sm" /></div>
            <select value={filter.classe} onChange={(e) => setFilter({ ...filter, classe: e.target.value })} className="px-2 py-1.5 rounded-lg bg-secondary text-sm border border-border">
              <option value="">Classe</option>{CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Mois YYYY-MM" value={filter.mois} onChange={(e) => setFilter({ ...filter, mois: e.target.value })} className="px-2 py-1.5 rounded-lg bg-secondary text-sm border border-border w-32" />
            <select value={filter.statut} onChange={(e) => setFilter({ ...filter, statut: e.target.value })} className="px-2 py-1.5 rounded-lg bg-secondary text-sm border border-border">
              <option value="">Statut</option><option value="emise">Émise</option><option value="payee">Payée</option><option value="annulee">Annulée</option>
            </select>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left px-3 py-2">N°</th><th className="text-left px-3 py-2">Élève</th>
                  <th className="text-left px-3 py-2">Classe</th><th className="text-left px-3 py-2">Mois</th>
                  <th className="text-right px-3 py-2">Montant</th><th className="text-left px-3 py-2">Échéance</th>
                  <th className="text-left px-3 py-2">Statut</th><th></th></tr>
              </thead>
              <tbody>
                {filteredInv.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Aucune facture</td></tr>}
                {filteredInv.map((i) => {
                  const s = studentMap.get(i.student_id);
                  return (
                    <tr key={i.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{i.numero}</td>
                      <td className="px-3 py-2">{s ? `${s.prenom} ${s.nom}` : "—"}</td>
                      <td className="px-3 py-2">{i.classe}</td>
                      <td className="px-3 py-2">{i.mois || "-"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{Number(i.montant).toLocaleString("fr-FR")}</td>
                      <td className="px-3 py-2">{i.date_echeance || "-"}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => togglePaid(i)} className={`px-2 py-0.5 rounded-full text-xs ${
                          i.statut === "payee" ? "bg-green-500/15 text-green-700 dark:text-green-400" :
                          i.statut === "annulee" ? "bg-red-500/15 text-red-700 dark:text-red-400" :
                          "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>{STATUT_LABEL[i.statut] || i.statut}</button>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button onClick={() => printInvoice(i)} className="p-1.5 rounded-lg hover:bg-secondary" title="Imprimer"><Printer className="w-4 h-4" /></button>
                        <button onClick={() => remove(i.id)} className="p-1.5 rounded-lg hover:bg-secondary text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal tarif */}
      {showFeeForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowFeeForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitFee} className="bg-card rounded-2xl border border-border p-5 w-full max-w-md space-y-3">
            <div className="flex justify-between items-center"><h3 className="font-bold text-lg">Tarif de classe</h3>
              <button type="button" onClick={() => setShowFeeForm(false)}><X className="w-4 h-4" /></button></div>
            <label className="text-sm block">Classe
              <select required value={feeForm.classe} onChange={(e) => setFeeForm({ ...feeForm, classe: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border">
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Frais inscription
                <input type="number" min="0" value={feeForm.frais_inscription} onChange={(e) => setFeeForm({ ...feeForm, frais_inscription: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" /></label>
              <label className="text-sm">Frais mensuel
                <input type="number" min="0" value={feeForm.frais_mensuel} onChange={(e) => setFeeForm({ ...feeForm, frais_mensuel: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Nombre de mois
                <input type="number" min="1" max="12" value={feeForm.mois_count} onChange={(e) => setFeeForm({ ...feeForm, mois_count: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" /></label>
              <label className="text-sm">Devise
                <input value={feeForm.devise} onChange={(e) => setFeeForm({ ...feeForm, devise: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" /></label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowFeeForm(false)} className="px-3 py-2 text-sm">Annuler</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal facture manuelle */}
      {showInvForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowInvForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitInv} className="bg-card rounded-2xl border border-border p-5 w-full max-w-md space-y-3">
            <div className="flex justify-between items-center"><h3 className="font-bold text-lg">Nouvelle facture</h3>
              <button type="button" onClick={() => setShowInvForm(false)}><X className="w-4 h-4" /></button></div>
            <label className="text-sm block">Élève
              <select required value={invForm.student_id} onChange={(e) => setInvForm({ ...invForm, student_id: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border">
                <option value="">—</option>{students.map((s) => <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe})</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Type
                <select value={invForm.type_frais} onChange={(e) => setInvForm({ ...invForm, type_frais: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border">
                  <option value="mensuel">Mensuel</option><option value="inscription">Inscription</option><option value="autre">Autre</option>
                </select>
              </label>
              {invForm.type_frais === "mensuel" && (
                <label className="text-sm">Mois
                  <input value={invForm.mois} onChange={(e) => setInvForm({ ...invForm, mois: e.target.value })} placeholder="YYYY-MM" className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
                </label>
              )}
            </div>
            <label className="text-sm block">Montant (FCFA)
              <input type="number" min="0" required value={invForm.montant} onChange={(e) => setInvForm({ ...invForm, montant: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
            </label>
            <label className="text-sm block">Notes
              <textarea rows={2} value={invForm.notes} onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowInvForm(false)} className="px-3 py-2 text-sm">Annuler</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Créer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
