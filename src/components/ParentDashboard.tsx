import { useEffect, useMemo, useState } from "react";
import { getStudents, getGrades, getPayments, getNotifications, markNotificationRead, MATIERES, type Student, type Grade, type Payment, type Notification } from "@/lib/store";
import { getInvoices, type Invoice } from "@/lib/feesStore";
import { useAuth } from "@/hooks/useAuth";
import { Search, GraduationCap, Bell, Receipt, TrendingUp, Award, LogOut } from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { useSchoolDisplayName } from "@/hooks/useSchoolName";

const COEFFICIENTS: Record<string, Record<string, number>> = {
  primaire: { "Français": 5, "Mathématiques": 5, "Anglais": 1, "SVT": 1, "Histoire-Géographie": 2, "EPS": 1, "Éducation Civique": 1, "Dessin": 1, "Musique": 1, "Informatique": 1 },
  college: { "Français": 4, "Mathématiques": 4, "Anglais": 2, "Physique-Chimie": 2, "SVT": 2, "Histoire-Géographie": 2, "EPS": 1, "Éducation Civique": 1, "Informatique": 1, "Dessin": 1, "Musique": 1 },
  lycee: { "Français": 3, "Mathématiques": 5, "Anglais": 2, "Physique-Chimie": 4, "SVT": 3, "Histoire-Géographie": 2, "Philosophie": 3, "EPS": 1, "Informatique": 1, "Éducation Civique": 1 },
};
function level(c: string): "primaire" | "college" | "lycee" {
  if (["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"].includes(c)) return "primaire";
  if (["6ème", "5ème", "4ème", "3ème"].includes(c)) return "college";
  return "lycee";
}
function coef(c: string, m: string) { return COEFFICIENTS[level(c)]?.[m] || 1; }

function computeAverage(student: Student, grades: Grade[], trimestre: number): number | null {
  const sg = grades.filter((g) => g.student_id === student.id && g.trimestre === trimestre);
  if (!sg.length) return null;
  const map: Record<string, number[]> = {};
  for (const g of sg) { (map[g.matiere] ??= []).push(Number(g.note)); }
  let tp = 0, tc = 0;
  for (const [mat, notes] of Object.entries(map)) {
    const avg = notes.reduce((a, b) => a + b, 0) / notes.length;
    const c = coef(student.classe, mat);
    tp += avg * c; tc += c;
  }
  return tc > 0 ? Math.round((tp / tc) * 100) / 100 : null;
}

export function ParentDashboard() {
  const { user, refresh } = useAuth();
  const schoolName = useSchoolDisplayName();
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [q, setQ] = useState("");
  const [trimestre, setTrimestre] = useState<1 | 2 | 3>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const [s, g, p, i, n] = await Promise.all([getStudents(), getGrades(), getPayments(), getInvoices(), getNotifications()]);
    setStudents(s); setGrades(g); setPayments(p); setInvoices(i); setNotifications(n);
  };
  useEffect(() => { load(); }, []);

  const myChildren = useMemo(() =>
    students.filter((s) => s.parent_user_id === user?.id || (user?.telephone && (s.contact_parent || "").replace(/\D+/g, "") === user.telephone.replace(/\D+/g, "")))
  , [students, user]);

  const filteredChildren = useMemo(() => {
    if (!q.trim()) return myChildren;
    const query = q.toLowerCase();
    return myChildren.filter((s) => `${s.prenom} ${s.nom} ${s.classe}`.toLowerCase().includes(query));
  }, [myChildren, q]);

  const myNotifs = notifications.filter((n) =>
    n.target_role === `parent:${user?.id}` || n.target_role === "parent" || n.target_role === "all"
  );

  const selected = students.find((s) => s.id === selectedId) || null;

  // Rang de l'enfant sélectionné dans sa classe pour le trimestre en cours
  const rankInfo = useMemo(() => {
    if (!selected) return null;
    const same = students.filter((s) => s.classe === selected.classe && s.status === "actif");
    const scored = same.map((s) => ({ id: s.id, avg: computeAverage(s, grades, trimestre) }))
      .filter((x) => x.avg !== null)
      .sort((a, b) => (b.avg || 0) - (a.avg || 0));
    const idx = scored.findIndex((x) => x.id === selected.id);
    if (idx < 0) return null;
    return { rank: idx + 1, total: scored.length, avg: scored[idx].avg };
  }, [selected, students, grades, trimestre]);

  // Bulletin détail
  const bulletinLines = useMemo(() => {
    if (!selected) return [];
    const sg = grades.filter((g) => g.student_id === selected.id && g.trimestre === trimestre);
    const map: Record<string, number[]> = {};
    for (const g of sg) { (map[g.matiere] ??= []).push(Number(g.note)); }
    return Object.entries(map).map(([m, notes]) => {
      const moy = Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 100) / 100;
      const c = coef(selected.classe, m);
      return { matiere: m, moyenne: moy, coefficient: c, total: Math.round(moy * c * 100) / 100 };
    });
  }, [selected, grades, trimestre]);

  // Évolution : moyenne trimestre 1, 2, 3
  const evolution = useMemo(() => {
    if (!selected) return [];
    return [1, 2, 3].map((t) => ({ t, avg: computeAverage(selected, grades, t) }));
  }, [selected, grades]);

  // Factures & paiements de l'enfant
  const childInvoices = selected ? invoices.filter((i) => i.student_id === selected.id) : [];
  const childPayments = selected ? payments.filter((p) => p.student_id === selected.id) : [];

  const handleLogout = () => { logoutUser(); refresh(); };
  const markRead = async (id: string) => { await markNotificationRead(id); load(); };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"><GraduationCap className="w-5 h-5" /></div>
            <div>
              <p className="text-xs opacity-80">{schoolName}</p>
              <h1 className="font-bold font-[family-name:var(--font-display)] leading-tight">Espace Parent</h1>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm"><LogOut className="w-4 h-4" /> Sortir</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-sm">Bonjour <strong>{user?.display_name}</strong>. Vous suivez <strong>{myChildren.length}</strong> enfant(s).</p>
        </div>

        {/* Notifications */}
        {myNotifs.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold"><Bell className="w-4 h-4 text-primary" /> Notifications</div>
            {myNotifs.slice(0, 5).map((n) => (
              <div key={n.id} className={`text-sm p-2 rounded-lg border border-border ${n.read ? "opacity-60" : "bg-primary/5"}`}>
                <p>{n.message}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</span>
                  {!n.read && <button onClick={() => markRead(n.id)} className="text-xs text-primary underline">Marquer lu</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recherche */}
        <div className="bg-card rounded-2xl border border-border p-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un enfant ou une classe..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>

        {/* Liste enfants */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredChildren.length === 0 && (
            <div className="col-span-full bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground text-sm">
              Aucun enfant lié à votre compte. Contactez la direction si votre numéro n'est pas correctement enregistré.
            </div>
          )}
          {filteredChildren.map((s) => {
            const avg = computeAverage(s, grades, trimestre);
            const isSel = selectedId === s.id;
            return (
              <button key={s.id} onClick={() => setSelectedId(s.id)}
                className={`text-left bg-card rounded-2xl border p-4 hover:shadow-md transition ${isSel ? "border-primary" : "border-border"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{s.prenom} {s.nom}</p>
                    <p className="text-xs text-muted-foreground">{s.classe}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "actif" ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-muted"}`}>{s.status}</span>
                </div>
                <div className="mt-3 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Moyenne T{trimestre}: <strong>{avg !== null ? `${avg}/20` : "—"}</strong>
                </div>
              </button>
            );
          })}
        </div>

        {/* Détail enfant */}
        {selected && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <h3 className="font-bold text-lg">{selected.prenom} {selected.nom} — {selected.classe}</h3>
                <p className="text-xs text-muted-foreground">Inscrit le {new Date(selected.date_inscription).toLocaleDateString("fr-FR")}</p>
              </div>
              <select value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value) as 1 | 2 | 3)} className="px-3 py-1.5 rounded-lg bg-secondary text-sm border border-border">
                <option value={1}>1er Trimestre</option><option value={2}>2ème Trimestre</option><option value={3}>3ème Trimestre</option>
              </select>
            </div>

            {rankInfo && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
                <Award className="w-5 h-5 text-primary" />
                <div className="text-sm">Rang dans la classe : <strong>{rankInfo.rank}</strong> / {rankInfo.total} — Moyenne <strong>{rankInfo.avg}/20</strong></div>
              </div>
            )}

            {/* Évolution */}
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Évolution</p>
              <div className="grid grid-cols-3 gap-2">
                {evolution.map((e) => (
                  <div key={e.t} className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Trimestre {e.t}</p>
                    <p className="text-xl font-bold">{e.avg !== null ? e.avg : "—"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bulletin */}
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1"><GraduationCap className="w-4 h-4" /> Bulletin T{trimestre}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-xs uppercase text-muted-foreground">
                    <tr><th className="text-left px-3 py-2">Matière</th><th className="text-center px-3 py-2">Moyenne</th>
                      <th className="text-center px-3 py-2">Coef.</th><th className="text-right px-3 py-2">Total</th></tr>
                  </thead>
                  <tbody>
                    {bulletinLines.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Aucune note saisie</td></tr>}
                    {bulletinLines.map((l) => (
                      <tr key={l.matiere} className="border-t border-border">
                        <td className="px-3 py-1.5">{l.matiere}</td>
                        <td className="px-3 py-1.5 text-center">{l.moyenne}</td>
                        <td className="px-3 py-1.5 text-center">{l.coefficient}</td>
                        <td className="px-3 py-1.5 text-right font-semibold">{l.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Factures */}
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1"><Receipt className="w-4 h-4" /> Factures & paiements</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-xs uppercase text-muted-foreground">
                    <tr><th className="text-left px-3 py-2">N°</th><th className="text-left px-3 py-2">Mois</th>
                      <th className="text-right px-3 py-2">Montant</th><th className="text-left px-3 py-2">Statut</th></tr>
                  </thead>
                  <tbody>
                    {childInvoices.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Aucune facture</td></tr>}
                    {childInvoices.map((i) => (
                      <tr key={i.id} className="border-t border-border">
                        <td className="px-3 py-1.5 font-mono text-xs">{i.numero}</td>
                        <td className="px-3 py-1.5">{i.mois || "-"}</td>
                        <td className="px-3 py-1.5 text-right">{Number(i.montant).toLocaleString("fr-FR")} FCFA</td>
                        <td className="px-3 py-1.5"><span className={`text-xs px-2 py-0.5 rounded-full ${i.statut === "payee" ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>{i.statut}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {childPayments.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">{childPayments.filter((p) => p.status === "payé").length} paiement(s) enregistré(s).</p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">EDUC 2.0 — {MATIERES.length} matières suivies</p>
      </main>
    </div>
  );
}
