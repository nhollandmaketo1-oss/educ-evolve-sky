import { RapportPresenceModule } from "./RapportPresenceModule";
import { BulletinModule } from "./BulletinModule";

export function RapportsModule() {
  const trimestres = [
    { label: "1er Trimestre", mois: "Septembre - Décembre" },
    { label: "2ème Trimestre", mois: "Janvier - Mars" },
    { label: "3ème Trimestre", mois: "Avril - Juin" },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Rapports & Bulletins</h2>

      {/* Calendrier Scolaire */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="font-semibold mb-3">📅 Calendrier Scolaire</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { event: "Rentrée scolaire", date: "02 Sept 2025" },
            { event: "Fin 1er trimestre", date: "13 Déc 2025" },
            { event: "Fin 2ème trimestre", date: "13 Mars 2026" },
            { event: "Fin d'année", date: "26 Juin 2026" },
          ].map((e) => (
            <div key={e.event} className="p-3 rounded-xl bg-secondary">
              <p className="font-medium text-sm text-foreground">{e.event}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{e.date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rapport de présence */}
      <RapportPresenceModule />

      {/* Bulletins scolaires */}
      <BulletinModule />
    </div>
  );
}
