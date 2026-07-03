import { useState, useEffect, useCallback } from "react";
import { getPersonnel, updatePersonnel, MATIERES, CLASSES, type Personnel } from "@/lib/store";
import {
  getContracts, addContract, updateContract, deleteContract,
  getStaffDocuments, uploadStaffDocument, deleteStaffDocument,
  type Contract, type StaffDocument,
} from "@/lib/hrStore";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Upload, Trash2, Pencil, Plus, X, User, Briefcase, GraduationCap, Save, Download } from "lucide-react";

export function ProfilsContratsModule() {
  const { user } = useAuth();
  const canEdit = user?.role === "dg";
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [tab, setTab] = useState<"fiche" | "contrats" | "documents">("fiche");

  useEffect(() => { getPersonnel().then((p) => { setPersonnel(p); if (p.length && !selectedId) setSelectedId(p[0].id); }); }, [selectedId]);

  const reloadDetails = useCallback(async () => {
    if (!selectedId) return;
    setContracts(await getContracts(selectedId));
    setDocuments(await getStaffDocuments(selectedId));
  }, [selectedId]);
  useEffect(() => { reloadDetails(); }, [reloadDetails]);

  const selected = personnel.find((p) => p.id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Left list */}
      <div className="bg-card rounded-2xl border border-border p-3 max-h-[70vh] overflow-y-auto">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-2">Personnel</h3>
        {personnel.length === 0 && <p className="text-sm text-muted-foreground p-2">Aucun personnel.</p>}
        <ul className="space-y-1">
          {personnel.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${selectedId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              >
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center overflow-hidden text-xs font-bold shrink-0">
                  {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : `${p.prenom[0]}${p.nom[0]}`}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.prenom} {p.nom}</div>
                  <div className={`text-[11px] truncate ${selectedId === p.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.matiere || p.type}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right details */}
      <div className="bg-card rounded-2xl border border-border p-4">
        {!selected ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">Sélectionnez un enseignant</div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden text-lg font-bold">
                {selected.photo ? <img src={selected.photo} alt="" className="w-full h-full object-cover" /> : `${selected.prenom[0]}${selected.nom[0]}`}
              </div>
              <div>
                <h3 className="font-bold text-lg font-[family-name:var(--font-display)]">{selected.prenom} {selected.nom}</h3>
                <p className="text-sm text-muted-foreground">{selected.matiere ? `${selected.matiere} — ` : ""}{selected.type}</p>
              </div>
            </div>
            <div className="flex gap-2 mb-4 border-b border-border">
              {([
                ["fiche", "Fiche", User],
                ["contrats", "Contrats", Briefcase],
                ["documents", "Documents", FileText],
              ] as const).map(([k, label, Icon]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
            {tab === "fiche" && <FicheTab p={selected} canEdit={canEdit} onSaved={async () => setPersonnel(await getPersonnel())} />}
            {tab === "contrats" && <ContratsTab personnelId={selected.id} canEdit={canEdit} contracts={contracts} reload={reloadDetails} />}
            {tab === "documents" && <DocumentsTab personnelId={selected.id} canEdit={canEdit} documents={documents} reload={reloadDetails} />}
          </>
        )}
      </div>
    </div>
  );
}

function FicheTab({ p, canEdit, onSaved }: { p: Personnel; canEdit: boolean; onSaved: () => void }) {
  const [form, setForm] = useState({
    matiere: p.matiere || MATIERES[0],
    niveau: p.niveau || "",
    email: p.email || "",
    adresse: p.adresse || "",
    telephone: p.telephone || "",
    date_embauche: p.date_embauche || "",
    diplomes: p.diplomes || "",
    salaire: String(p.salaire || 0),
  });
  useEffect(() => {
    setForm({
      matiere: p.matiere || MATIERES[0],
      niveau: p.niveau || "",
      email: p.email || "",
      adresse: p.adresse || "",
      telephone: p.telephone || "",
      date_embauche: p.date_embauche || "",
      diplomes: p.diplomes || "",
      salaire: String(p.salaire || 0),
    });
  }, [p]);

  const save = async () => {
    await updatePersonnel(p.id, {
      matiere: form.matiere || null,
      niveau: form.niveau || null,
      email: form.email || null,
      adresse: form.adresse || null,
      telephone: form.telephone || null,
      date_embauche: form.date_embauche || null,
      diplomes: form.diplomes || null,
      salaire: Number(form.salaire) || 0,
    });
    onSaved();
  };

  const F = "w-full px-3 py-2 rounded-xl bg-input text-foreground border border-border text-sm disabled:opacity-70";
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Matière">
        <select disabled={!canEdit} value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} className={F}>
          {MATIERES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Niveau enseigné">
        <select disabled={!canEdit} value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} className={F}>
          <option value="">—</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="E-mail"><input disabled={!canEdit} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={F} /></Field>
      <Field label="Téléphone"><input disabled={!canEdit} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className={F} /></Field>
      <Field label="Adresse" full><input disabled={!canEdit} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className={F} /></Field>
      <Field label="Date d'embauche"><input disabled={!canEdit} type="date" value={form.date_embauche} onChange={(e) => setForm({ ...form, date_embauche: e.target.value })} className={F} /></Field>
      <Field label="Salaire (FCFA)"><input disabled={!canEdit} type="number" value={form.salaire} onChange={(e) => setForm({ ...form, salaire: e.target.value })} className={F} /></Field>
      <Field label="Diplômes & qualifications" full>
        <textarea disabled={!canEdit} value={form.diplomes} onChange={(e) => setForm({ ...form, diplomes: e.target.value })} className={`${F} min-h-[80px]`} placeholder="Licence en Mathématiques, CAPES, Master en pédagogie..." />
      </Field>
      {canEdit && (
        <div className="md:col-span-2 flex justify-end">
          <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Save className="w-4 h-4" /> Enregistrer la fiche
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ContratsTab({ personnelId, canEdit, contracts, reload }: { personnelId: string; canEdit: boolean; contracts: Contract[]; reload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Contract | null>(null);
  const [form, setForm] = useState({ type: "CDI", date_debut: new Date().toISOString().slice(0, 10), date_fin: "", salaire: "", statut: "actif", notes: "" });

  const reset = () => { setShowForm(false); setEdit(null); setForm({ type: "CDI", date_debut: new Date().toISOString().slice(0, 10), date_fin: "", salaire: "", statut: "actif", notes: "" }); };
  const openEdit = (c: Contract) => { setEdit(c); setShowForm(true); setForm({ type: c.type, date_debut: c.date_debut, date_fin: c.date_fin || "", salaire: String(c.salaire), statut: c.statut, notes: c.notes || "" }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { personnel_id: personnelId, type: form.type, date_debut: form.date_debut, date_fin: form.date_fin || null, salaire: Number(form.salaire) || 0, statut: form.statut, notes: form.notes || null };
    if (edit) await updateContract(edit.id, payload); else await addContract(payload);
    reset();
    reload();
  };
  const del = async (id: string) => { if (confirm("Supprimer ce contrat ?")) { await deleteContract(id); reload(); } };

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={() => { reset(); setShowForm(true); }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Nouveau contrat
          </button>
        </div>
      )}
      {contracts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun contrat enregistré.</p>
      ) : (
        <div className="grid gap-2">
          {contracts.map((c) => (
            <div key={c.id} className="p-3 rounded-xl border border-border bg-background flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{c.type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${c.statut === "actif" ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-secondary text-muted-foreground"}`}>{c.statut}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Du {c.date_debut}{c.date_fin ? ` au ${c.date_fin}` : " — sans terme"} · {Number(c.salaire).toLocaleString()} FCFA</p>
                {c.notes && <p className="text-xs mt-1">{c.notes}</p>}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => del(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{edit ? "Modifier le contrat" : "Nouveau contrat"}</h3><button onClick={reset}><X className="w-5 h-5" /></button></div>
            <form onSubmit={submit} className="space-y-3 text-sm">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border">
                <option>CDI</option><option>CDD</option><option>Stage</option><option>Vacation</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} className="px-3 py-2 rounded-xl bg-input border border-border" required />
                <input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} className="px-3 py-2 rounded-xl bg-input border border-border" placeholder="Fin (facultatif)" />
              </div>
              <input type="number" value={form.salaire} onChange={(e) => setForm({ ...form, salaire: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border" placeholder="Salaire (FCFA)" required />
              <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border">
                <option value="actif">Actif</option><option value="suspendu">Suspendu</option><option value="terminé">Terminé</option>
              </select>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-input border border-border min-h-[70px]" placeholder="Notes / clauses particulières" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">{edit ? "Enregistrer" : "Créer"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ personnelId, canEdit, documents, reload }: { personnelId: string; canEdit: boolean; documents: StaffDocument[]; reload: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("CV");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    await uploadStaffDocument(personnelId, f, docType);
    setUploading(false);
    e.target.value = "";
    reload();
  };
  const del = async (id: string) => { if (confirm("Supprimer ce document ?")) { await deleteStaffDocument(id); reload(); } };

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="px-3 py-2 rounded-lg bg-background border border-border text-sm">
            <option>CV</option><option>Diplôme</option><option>Contrat signé</option><option>Pièce d'identité</option><option>Autre</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90">
            <Upload className="w-4 h-4" /> {uploading ? "Envoi…" : "Téléverser un document"}
            <input type="file" onChange={onFile} disabled={uploading} className="hidden" />
          </label>
        </div>
      )}
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun document.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-background">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3">
              <GraduationCap className="w-5 h-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{d.nom}</p>
                <p className="text-xs text-muted-foreground">{d.type}</p>
              </div>
              <a href={d.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-secondary" title="Ouvrir"><Download className="w-4 h-4 text-muted-foreground" /></a>
              {canEdit && <button onClick={() => del(d.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
