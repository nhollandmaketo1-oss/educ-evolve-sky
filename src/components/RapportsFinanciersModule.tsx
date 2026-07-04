import { useEffect, useMemo, useState } from "react";
import { getPayments } from "@/lib/store";
import { getExpenses, type Expense } from "@/lib/expensesStore";
import type { Payment } from "@/lib/store";
import { TrendingUp, TrendingDown, Wallet, Download, PieChart } from "lucide-react";

function fmt(n: number) { return n.toLocaleString("fr-FR"); }

export function RapportsFinanciersModule() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [scope, setScope] = useState<"month" | "year" | "all">("month");

  useEffect(() => {
    getPayments().then(setPayments);
    getExpenses().then(setExpenses);
  }, []);

  const inScope = (dateStr: string) => {
    if (scope === "all") return true;
    if (scope === "year") return dateStr.startsWith(period.slice(0, 4));
    return dateStr.startsWith(period);
  };

  const { recettes, charges, byCat, byMonth } = useMemo(() => {
    const paidPayments = payments.filter((p) => p.status === "payé" && inScope(p.date));
    const paidExpenses = expenses.filter((e) => e.statut === "paye" && inScope(e.date_depense));

    const recettes = paidPayments.reduce((s, p) => s + Number(p.montant || 0), 0);
    const charges = paidExpenses.reduce((s, e) => s + Number(e.montant || 0), 0);

    const byCat: Record<string, number> = {};
    for (const e of paidExpenses) byCat[e.categorie] = (byCat[e.categorie] || 0) + Number(e.montant);

    // monthly breakdown (last 6 months of period year)
    const yr = period.slice(0, 4);
    const byMonth: { month: string; rec: number; ch: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${yr}-${String(m).padStart(2, "0")}`;
      const rec = payments.filter((p) => p.status === "payé" && p.date.startsWith(key)).reduce((s, p) => s + Number(p.montant), 0);
      const ch = expenses.filter((e) => e.statut === "paye" && e.date_depense.startsWith(key)).reduce((s, e) => s + Number(e.montant), 0);
      if (rec || ch) byMonth.push({ month: key, rec, ch });
    }

    return { recettes, charges, byCat, byMonth };
  }, [payments, expenses, period, scope]);

  const net = recettes - charges;
  const catTotal = Object.values(byCat).reduce((a, b) => a + b, 0) || 1;
  const maxMonth = Math.max(1, ...byMonth.flatMap((b) => [b.rec, b.ch]));

  const exportCsv = () => {
    const rows = [
      ["Rapport financier", scope === "all" ? "Tout" : scope === "year" ? period.slice(0, 4) : period],
      [],
      ["Recettes", String(recettes)],
      ["Charges", String(charges)],
      ["Résultat net", String(net)],
      [],
      ["Répartition des charges par catégorie"],
      ["Catégorie", "Montant", "%"],
      ...Object.entries(byCat).map(([k, v]) => [k, String(v), `${((v / catTotal) * 100).toFixed(1)}%`]),
      [],
      ["Évolution mensuelle"],
      ["Mois", "Recettes", "Charges", "Net"],
      ...byMonth.map((b) => [b.month, String(b.rec), String(b.ch), String(b.rec - b.ch)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `rapport-financier-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-card rounded-2xl border border-border p-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-secondary p-1 text-xs">
          {(["month", "year", "all"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)}
              className={`px-3 py-1 rounded-md ${scope === s ? "bg-primary text-primary-foreground" : ""}`}>
              {s === "month" ? "Mois" : s === "year" ? "Année" : "Tout"}
            </button>
          ))}
        </div>
        {scope !== "all" && (
          <input
            type={scope === "year" ? "number" : "month"}
            value={scope === "year" ? period.slice(0, 4) : period}
            onChange={(e) => setPeriod(scope === "year" ? `${e.target.value}-01` : e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-secondary text-sm border border-border" />
        )}
        <div className="flex-1" />
        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm hover:bg-secondary/70">
          <Download className="w-4 h-4" /> Exporter CSV
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Recettes</p>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-green-600 mt-1">{fmt(recettes)} FCFA</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Charges</p>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-red-600 mt-1">{fmt(charges)} FCFA</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Résultat net</p>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <p className={`text-2xl font-bold font-[family-name:var(--font-display)] mt-1 ${net >= 0 ? "text-primary" : "text-red-600"}`}>{fmt(net)} FCFA</p>
        </div>
      </div>

      {/* By category */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><PieChart className="w-4 h-4" /> Charges par catégorie</h3>
        {Object.keys(byCat).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune dépense sur la période.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
              const pct = (v / catTotal) * 100;
              return (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{k}</span>
                    <span className="text-muted-foreground">{fmt(v)} FCFA · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly trend */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="font-semibold mb-3">Évolution mensuelle — {period.slice(0, 4)}</h3>
        {byMonth.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée pour cette année.</p>
        ) : (
          <div className="space-y-3">
            {byMonth.map((b) => (
              <div key={b.month}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{b.month}</span>
                  <span className="text-muted-foreground">Net : <span className={b.rec - b.ch >= 0 ? "text-primary" : "text-red-600"}>{fmt(b.rec - b.ch)}</span></span>
                </div>
                <div className="flex gap-1 h-3 rounded overflow-hidden bg-secondary">
                  <div className="bg-green-500" style={{ width: `${(b.rec / maxMonth) * 50}%` }} title={`Recettes ${fmt(b.rec)}`} />
                  <div className="bg-red-500" style={{ width: `${(b.ch / maxMonth) * 50}%` }} title={`Charges ${fmt(b.ch)}`} />
                </div>
              </div>
            ))}
            <div className="flex gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Recettes</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> Charges</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
