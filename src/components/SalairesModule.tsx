import { useState, useEffect } from "react";
import { getPersonnel, type Personnel } from "@/lib/store";

export function SalairesModule() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  useEffect(() => { getPersonnel().then(setPersonnel); }, []);

  const totalSalaires = personnel.reduce((sum, p) => sum + Number(p.salaire), 0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Gestion des Salaires</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Total Personnel</p>
          <p className="text-2xl font-bold text-foreground">{personnel.length}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Masse Salariale</p>
          <p className="text-2xl font-bold text-foreground">{totalSalaires.toLocaleString()} FCFA</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Salaire Moyen</p>
          <p className="text-2xl font-bold text-foreground">{personnel.length ? Math.round(totalSalaires / personnel.length).toLocaleString() : 0} FCFA</p>
        </div>
      </div>
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-secondary text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Nom Complet</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Matière</th>
              <th className="text-left px-4 py-3 font-medium">Salaire Mensuel</th>
            </tr></thead>
            <tbody>
              {personnel.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucun personnel</td></tr>
              ) : personnel.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium">{p.prenom} {p.nom}</td>
                  <td className="px-4 py-3">{p.type}</td>
                  <td className="px-4 py-3">{p.matiere || "—"}</td>
                  <td className="px-4 py-3 font-semibold">{Number(p.salaire).toLocaleString()} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
