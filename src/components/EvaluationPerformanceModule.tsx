import { useState, useEffect, useCallback } from "react";
import { getPersonnel, type Personnel } from "@/lib/store";
import {
  getEvaluations, addEvaluation, updateEvaluation, deleteEvaluation,
  type PerformanceEvaluation,
} from "@/lib/hrStore";
import { useAuth } from "@/hooks/useAuth";
import { Plus, X, Pencil, Trash2, Target, TrendingUp, Award } from "lucide-react";

const CURRENT_PERIODE = () => {
  const d = new Date();
  return `${d.getFullYear()}-T${Math.ceil((d.getMonth() + 1) / 3)}`;
};

export function EvaluationPerformanceModule() {
  const { user } = useAuth();
  const canEdit = user?.role === "dg";
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [evals, setEvals] = useState<PerformanceEvaluation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<PerformanceEvaluation | null>(null);
  const [form, setForm] = useState({
    periode: CURRENT_PERIODE(),
    objectifs: "",
    ponctualite: 15,
    pedagogie: 15,
    discipline: 15,
    participation: 15,
    commentaire: "",
  });

  useEffect(() => {
    getPersonnel().then((p) => {
      const teachers = p.filter((x) => x.type === "enseignant");
      setPersonnel(teachers);
      if (teachers.length && !selectedId) setSelectedId(teachers[0].id);
    });
  }, [selectedId]);

  const reload = useCallback(async () => {
    if (!selectedId) { setEvals([]); return; }
    setEvals(await getEvaluations(selectedId));
  }, [selectedId]);
  useEffect(() => { reload(); }, [reload]);

  const selected = personnel.find((p) => p.id === selectedId);

  const reset = () => {
    setShowForm(false); setEdit(null);
    setForm({ periode: CURRENT_PERIODE(), objectifs: "", ponctualite: 15, pedagogie: 15, discipline: 15, participation: 15, commentaire: "" });
  };
  const openEdit = (e: PerformanceEvaluation) => {
    setEdit(e); setShowForm(true);
    setForm({
      periode: e.periode, objectifs: e.objectifs || "",
      ponctualite: e.ponctualite, pedagogie: e.pedagogie, discipline: e.discipline, participation: e.participation,
      commentaire: e.commentaire || "",
    });
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedId) return;
    const payload = {
      personnel_id: selectedId,
      periode: form.periode,
      objectifs: form.objectifs || null,
      ponctualite: Number(form.ponctualite),
      pedagogie: Number(form.pedagogie),
      discipline: Number(form.discipline),
      participation: Number(form.participation),
      commentaire: form.commentaire || null,
    };
    if (edit) await updateEvaluation(edit.id, payload); else await addEvaluation(payload);
    reset(); reload();
  };
  const del = async (id: string) => { if (confirm("Supprimer cette évaluation ?")) { await deleteEvaluation(id); reload(); } };

  const avg = evals.length ? (evals.reduce((s, e) => s + Number(e.note_globale), 0) / evals.length) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <div className="bg-card rounded-2xl border border-border p-3 max-h-[70vh] overflow-y-auto">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-2">Enseignants</h3>
        {personnel.length === 0 && <p className="text-sm text-muted-foreground p-2">Aucun enseignant.</p>}
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
                  <div className={`text-[11px] truncate ${selectedId === p.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.matiere}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        {!selected ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">Sélectionnez un enseignant</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCard icon={Award} label="Note moyenne" value={avg ? `${avg.toFixed(1)}/20` : "—"} accent="primary" />
              <StatCard icon={TrendingUp} label="Évaluations" value={String(evals.length)} accent="accent" />
              <StatCard icon={Target} label="Dernier objectif" value={evals[0]?.objectifs?.slice(0, 24) || "—"} accent="secondary" />
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold font-[family-name:var(--font-display)]">Évaluations de {selected.prenom} {selected.nom}</h3>
                {canEdit && (
                  <button onClick={() => { reset(); setShowForm(true); }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                    <Plus className="w-4 h-4" /> Nouvelle évaluation
                  </button>
                )}
              </div>
              {evals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune évaluation pour cet enseignant.</p>
              ) : (
                <div className="space-y-2">
                  {evals.map((e) => (
                    <div key={e.id} className="p-3 rounded-xl border border-border bg-background">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">Période {e.periode}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${Number(e.note_globale) >= 14 ? "bg-green-500/15 text-green-700 dark:text-green-400" : Number(e.note_globale) >= 10 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-red-500/15 text-red-700 dark:text-red-400"}`}>
                              Note {Number(e.note_globale).toFixed(1)}/20
                            </span>
                          </div>
                          {e.objectifs && <p className="text-xs mt-1"><strong>Objectifs :</strong> {e.objectifs}</p>}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                            <Indic label="Ponctualité" value={e.ponctualite} />
                            <Indic label="Pédagogie" value={e.pedagogie} />
                            <Indic label="Discipline" value={e.discipline} />
                            <Indic label="Participation" value={e.participation} />
                          </div>
                          {e.commentaire && <p className="text-xs mt-2 italic text-muted-foreground">« {e.commentaire} »</p>}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                            <button onClick={() => del(e.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showForm && selected && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{edit ? "Modifier" : "Nouvelle"} évaluation</h3><button onClick={reset}><X className="w-5 h-5" /></button></div>
            <form onSubmit={submit} className="space-y-3 text-sm">
              <input value={form.periode} onChange={(e) => setForm({ ...form, periode: e.target.value })} placeholder="Période (ex: 2026-T1)" className="w-full px-3 py-2 rounded-xl bg-input border border-border" required />
              <textarea value={form.objectifs} onChange={(e) => setForm({ ...form, objectifs: e.target.value })} placeholder="Objectifs pédagogiques" className="w-full px-3 py-2 rounded-xl bg-input border border-border min-h-[70px]" />
              <div className="grid grid-cols-2 gap-3">
                <Slider label="Ponctualité" value={form.ponctualite} onChange={(v) => setForm({ ...form, ponctualite: v })} />
                <Slider label="Pédagogie" value={form.pedagogie} onChange={(v) => setForm({ ...form, pedagogie: v })} />
                <Slider label="Discipline classe" value={form.discipline} onChange={(v) => setForm({ ...form, discipline: v })} />
                <Slider label="Participation vie scolaire" value={form.participation} onChange={(v) => setForm({ ...form, participation: v })} />
              </div>
              <div className="text-center text-sm font-semibold">Note globale (calculée) : {((form.ponctualite + form.pedagogie + form.discipline + form.participation) / 4).toFixed(2)}/20</div>
              <textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} placeholder="Commentaire général" className="w-full px-3 py-2 rounded-xl bg-input border border-border min-h-[60px]" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">{edit ? "Enregistrer" : "Créer l'évaluation"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: "primary" | "accent" | "secondary" }) {
  const cls = accent === "primary" ? "bg-primary/10 text-primary" : accent === "accent" ? "bg-accent/10 text-accent" : "bg-secondary text-foreground";
  return (
    <div className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cls}`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-bold truncate">{value}</p>
      </div>
    </div>
  );
}

function Indic({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, (Number(value) / 20) * 100);
  return (
    <div>
      <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{Number(value).toFixed(1)}</span></div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}/20</span></div>
      <input type="range" min={0} max={20} step={0.5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" />
    </label>
  );
}
