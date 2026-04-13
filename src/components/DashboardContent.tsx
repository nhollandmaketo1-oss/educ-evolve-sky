import { GraduationCap, CreditCard, UserCog, Wallet, ClipboardCheck, BarChart3 } from "lucide-react";
import { getStudents, getPersonnel, getPayments } from "@/lib/store";
import { getCurrentUser, getRoleLabel } from "@/lib/auth";
import { Link } from "@tanstack/react-router";

const iconBgs = [
  "bg-primary/10 text-primary",
  "bg-success/10 text-success",
  "bg-accent/10 text-accent",
  "bg-warning/10 text-warning",
  "bg-chart-5/10 text-chart-5",
  "bg-destructive/10 text-destructive",
];

export function DashboardContent() {
  const user = getCurrentUser();
  const students = getStudents();
  const personnel = getPersonnel();
  const payments = getPayments();
  const totalPaid = payments.filter((p) => p.status === "payé").length;
  const totalUnpaid = payments.filter((p) => p.status === "impayé").length;
  const enseignants = personnel.filter((p) => p.type === "enseignant");
  const surveillants = personnel.filter((p) => p.type === "surveillant");

  const cards = [
    { icon: GraduationCap, label: "Élèves", value: String(students.length), desc: "Inscription et gestion des élèves", to: "/eleves", bg: iconBgs[0] },
    { icon: CreditCard, label: "Paiements", value: `${totalPaid}/${totalPaid + totalUnpaid}`, desc: "Suivi des paiements scolaires", to: "/paiements", bg: iconBgs[1] },
    { icon: UserCog, label: "Personnel", value: String(personnel.length), desc: "Gestion des enseignants et surveillants", to: "/personnel", bg: iconBgs[2] },
    { icon: Wallet, label: "Salaires", value: `${personnel.length} agents`, desc: "Gestion des salaires du personnel", to: "/salaires", bg: iconBgs[3] },
    { icon: ClipboardCheck, label: "Présences", value: `${enseignants.length + surveillants.length}`, desc: "Suivi des présences au poste", to: "/presences", bg: iconBgs[4] },
    { icon: BarChart3, label: "Statistiques", value: "", desc: "Évolution globale de l'école", to: "/statistiques", bg: iconBgs[5] },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] text-foreground">
          Bienvenue, {user?.displayName}
        </h2>
        <p className="text-muted-foreground text-sm">
          {user ? getRoleLabel(user.role) : ""} — Tableau de bord
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-card rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className={`p-3 rounded-2xl ${card.bg}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{card.label}</p>
                <span className="text-xl font-bold text-foreground">{card.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
