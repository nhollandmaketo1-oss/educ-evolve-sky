export function RapportsModule() {
  const trimestres = [
    { label: "1er Trimestre", mois: "Septembre - Décembre" },
    { label: "2ème Trimestre", mois: "Janvier - Mars" },
    { label: "3ème Trimestre", mois: "Avril - Juin" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Rapports Trimestriels</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {trimestres.map((t) => (
          <div key={t.label} className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center">
            <h3 className="font-bold text-lg text-foreground">{t.label}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t.mois}</p>
            <button className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              Générer le rapport
            </button>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="font-semibold mb-3">Calendrier Scolaire</h3>
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
    </div>
  );
}
