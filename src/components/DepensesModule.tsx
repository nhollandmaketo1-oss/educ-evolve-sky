import { useEffect, useState, useMemo } from "react";
import {
  getExpenses, addExpense, updateExpense, deleteExpense,
  getExpenseCategories, addExpenseCategory, uploadJustificatif,
  type Expense, type ExpenseCategory,
} from "@/lib/expensesStore";
import { Plus, Trash2, Pencil, Upload, X, FileText, Search, Filter, Download } from "lucide-react";
import { toast } from "sonner";

const MODES = ["especes", "cheque", "virement", "mobile_money", "carte"] as const;
const STATUTS = ["paye", "en_attente", "annule"] as const;

const MODE_LABEL: Record<string, string> = {
  especes: "Espèces", cheque: "Chèque", virement: "Virement",
  mobile_money: "Mobile Money", carte: "Carte",
};
const STATUT_LABEL: Record<string, string> = {
  paye: "Payé", en_attente: "En attente", annule: "Annulé",
};

const empty = (): Omit<Expense, "id" | "created_at" | "updated_at"> => ({
  date_depense: new Date().toISOString().slice(0, 10),
  categorie: "",
  fournisseur: "",
  description: "",
  montant: 0,
  mode_paiement: "especes",
  reference: "",
  justificatif_url: null,
  statut: "paye",
  notes: "",
});

export function DepensesModule() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState({ q: "", cat: "", month: "" });
  const [newCat, setNewCat] = useState("");
  const [showCatForm, setShowCatForm] = useState(false);

  const reload = async () => {
    setExpenses(await getExpenses());
    setCategories(await getExpenseCategories());
  };
  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (!form.categorie && categories.length) setForm((f) => ({ ...f, categorie: categories[0].nom }));
  }, [categories, form.categorie]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (filter.cat && e.categorie !== filter.cat) return false;
      if (filter.month && !e.date_depense.startsWith(filter.month)) return false;
      if (filter.q) {
        const q = filter.q.toLowerCase();
        if (!e.description.toLowerCase().includes(q) && !(e.fournisseur || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [expenses, filter]);

  const total = filtered.reduce((s, e) => s + (e.statut === "paye" ? Number(e.montant) : 0), 0);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.description.trim() || !form.categorie || Number(form.montant) < 0) {
      toast.error("Description, catégorie et montant requis"); return;
    }
    if (editingId) {
      await updateExpense(editingId, form);
      toast.success("Dépense mise à jour");
    } else {
      await addExpense(form);
      toast.success("Dépense enregistrée");
    }
    setShowForm(false); setEditingId(null); setForm(empty());
    reload();
  };

  const edit = (e: Expense) => {
    setForm({
      date_depense: e.date_depense, categorie: e.categorie, fournisseur: e.fournisseur || "",
      description: e.description, montant: Number(e.montant), mode_paiement: e.mode_paiement,
      reference: e.reference || "", justificatif_url: e.justificatif_url, statut: e.statut, notes: e.notes || "",
    });
    setEditingId(e.id); setShowForm(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette dépense ?")) return;
    await deleteExpense(id); toast.success("Supprimée"); reload();
  };

  const upload = async (file: File) => {
    setUploading(true);
    const url = await uploadJustificatif(file);
    setUploading(false);
    if (url) { setForm((f) => ({ ...f, justificatif_url: url })); toast.success("Justificatif téléversé"); }
    else toast.error("Échec du téléversement");
  };

  const addCat = async () => {
    if (!newCat.trim()) return;
    const c = await addExpenseCategory(newCat.trim());
    if (c) { setNewCat(""); setShowCatForm(false); toast.success("Catégorie ajoutée"); reload(); }
  };

  const exportCsv = () => {
    const rows = [
      ["Date", "Catégorie", "Fournisseur", "Description", "Montant", "Mode", "Statut", "Référence"],
      ...filtered.map((e) => [
        e.date_depense, e.categorie, e.fournisseur || "", e.description,
        String(e.montant), MODE_LABEL[e.mode_paiement] || e.mode_paiement,
        STATUT_LABEL[e.statut] || e.statut, e.reference || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `depenses-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header stats + actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Nombre de dépenses</p>
          <p className="text-2xl font-bold font-[family-name:var(--font-display)]">{filtered.length}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total payé (filtré)</p>
          <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-primary">{total.toLocaleString("fr-FR")} FCFA</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 flex gap-2 items-center justify-around">
          <button onClick={() => { setForm(empty()); setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Nouvelle
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/70">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-3 flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })}
            placeholder="Rechercher…" className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <select value={filter.cat} onChange={(e) => setFilter({ ...filter, cat: e.target.value })}
          className="px-2 py-1.5 rounded-lg bg-secondary text-sm border border-border">
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c.id} value={c.nom}>{c.nom}</option>)}
        </select>
        <input type="month" value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })}
          className="px-2 py-1.5 rounded-lg bg-secondary text-sm border border-border" />
        <button onClick={() => setShowCatForm((v) => !v)} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg hover:bg-secondary">
          <Filter className="w-3.5 h-3.5" /> Catégories
        </button>
      </div>

      {showCatForm && (
        <div className="bg-card rounded-2xl border border-border p-3 flex gap-2 flex-wrap items-center">
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nouvelle catégorie…"
            className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg bg-secondary text-sm border border-border" />
          <button onClick={addCat} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm">Ajouter</button>
          <div className="w-full flex flex-wrap gap-1">
            {categories.map((c) => <span key={c.id} className="px-2 py-0.5 rounded-full bg-secondary text-xs">{c.nom}</span>)}
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-card rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Catégorie</th>
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-left px-3 py-2">Fournisseur</th>
              <th className="text-right px-3 py-2">Montant</th>
              <th className="text-left px-3 py-2">Mode</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Justif.</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center text-muted-foreground py-8">Aucune dépense</td></tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-3 py-2 whitespace-nowrap">{e.date_depense}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{e.categorie}</span></td>
                <td className="px-3 py-2">{e.description}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.fournisseur || "—"}</td>
                <td className="px-3 py-2 text-right font-semibold">{Number(e.montant).toLocaleString("fr-FR")}</td>
                <td className="px-3 py-2 text-xs">{MODE_LABEL[e.mode_paiement] || e.mode_paiement}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    e.statut === "paye" ? "bg-green-500/15 text-green-700 dark:text-green-400" :
                    e.statut === "en_attente" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                    "bg-red-500/15 text-red-700 dark:text-red-400"
                  }`}>{STATUT_LABEL[e.statut] || e.statut}</span>
                </td>
                <td className="px-3 py-2">
                  {e.justificatif_url
                    ? <a href={e.justificatif_url} target="_blank" rel="noreferrer" className="text-primary underline text-xs inline-flex items-center gap-1"><FileText className="w-3 h-3" /> Voir</a>
                    : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => edit(e)} className="p-1.5 rounded-lg hover:bg-secondary"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(e.id)} className="p-1.5 rounded-lg hover:bg-secondary text-red-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
            className="bg-card rounded-2xl border border-border p-5 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg font-[family-name:var(--font-display)]">{editingId ? "Modifier" : "Nouvelle"} dépense</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Date
                <input type="date" required value={form.date_depense} onChange={(e) => setForm({ ...form, date_depense: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
              </label>
              <label className="text-sm">Catégorie
                <select required value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border">
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                </select>
              </label>
            </div>
            <label className="text-sm block">Description
              <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Fournisseur
                <input value={form.fournisseur || ""} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
              </label>
              <label className="text-sm">Montant (FCFA)
                <input type="number" min="0" step="0.01" required value={form.montant}
                  onChange={(e) => setForm({ ...form, montant: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Mode de paiement
                <select value={form.mode_paiement} onChange={(e) => setForm({ ...form, mode_paiement: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border">
                  {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
                </select>
              </label>
              <label className="text-sm">Statut
                <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border">
                  {STATUTS.map((s) => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
                </select>
              </label>
            </div>
            <label className="text-sm block">Référence / N° facture
              <input value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
            </label>
            <div className="text-sm">
              <span>Justificatif</span>
              <div className="mt-1 flex items-center gap-2">
                <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border cursor-pointer hover:bg-secondary/70">
                  <Upload className="w-4 h-4" />
                  <span className="text-xs">{uploading ? "Envoi…" : (form.justificatif_url ? "Remplacer le fichier" : "Choisir un fichier")}</span>
                  <input type="file" className="hidden" accept="image/*,application/pdf"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
                </label>
                {form.justificatif_url && (
                  <a href={form.justificatif_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Voir</a>
                )}
              </div>
            </div>
            <label className="text-sm block">Notes
              <textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg hover:bg-secondary text-sm">Annuler</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">{editingId ? "Enregistrer" : "Ajouter"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
