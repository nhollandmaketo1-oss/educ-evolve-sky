import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, CreditCard, UserCog, Wallet, ClipboardCheck,
  BarChart3, FileText, Settings, LogOut, GraduationCap, User, BookOpen, Sliders, MessageCircle,
  IdCard, LineChart, Receipt, TrendingUp, Coins,
} from "lucide-react";
import { useSchoolDisplayName, useSchoolLogo } from "@/hooks/useSchoolName";
import { getRoleLabel, logoutUser } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

const allNavItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", to: "/", roles: ["dg", "de", "gestionnaire", "comptable"] },
  { icon: Users, label: "Élèves", to: "/eleves", roles: ["dg", "de", "gestionnaire"] },
  { icon: CreditCard, label: "Paiements", to: "/paiements", roles: ["dg", "gestionnaire", "comptable"] },
  { icon: Coins, label: "Frais & Factures", to: "/frais-scolarite", roles: ["dg", "comptable"] },
  { icon: UserCog, label: "Personnel", to: "/personnel", roles: ["dg", "de"] },
  { icon: IdCard, label: "Profils & Contrats", to: "/profils-contrats", roles: ["dg", "de", "comptable"] },
  { icon: LineChart, label: "Évaluation performance", to: "/evaluations", roles: ["dg", "de"] },
  { icon: Wallet, label: "Salaires", to: "/salaires", roles: ["dg", "gestionnaire", "comptable"] },
  { icon: ClipboardCheck, label: "Présences", to: "/presences", roles: ["dg", "de"] },
  { icon: BookOpen, label: "Notes", to: "/notes", roles: ["dg", "de"] },
  { icon: BarChart3, label: "Statistiques", to: "/statistiques", roles: ["dg", "de"] },
  { icon: FileText, label: "Rapports", to: "/rapports", roles: ["dg", "de", "gestionnaire", "comptable"] },
  { icon: Receipt, label: "Dépenses", to: "/depenses", roles: ["dg", "comptable"] },
  { icon: TrendingUp, label: "Rapports financiers", to: "/rapports-financiers", roles: ["dg", "comptable"] },
  { icon: Settings, label: "Utilisateurs", to: "/utilisateurs", roles: ["dg"] },
  { icon: Sliders, label: "Paramètres", to: "/parametres", roles: ["dg"] },
  { icon: User, label: "Mon Profil", to: "/profil", roles: ["dg", "de", "gestionnaire", "comptable"] },
  { icon: MessageCircle, label: "Messagerie", to: "/messagerie", roles: ["dg", "de", "gestionnaire", "comptable"] },
];

export function AppSidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, refresh } = useAuth();
  const schoolName = useSchoolDisplayName();
  const schoolLogo = useSchoolLogo();
  const role = user?.role || "gestionnaire";
  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    logoutUser();
    refresh();
  };

  const sidebarContent = (
    <aside className="flex flex-col bg-sidebar text-sidebar-foreground h-screen w-60 shrink-0 overflow-hidden">
      <div className="flex flex-col items-center py-3 px-3 border-b border-sidebar-border shrink-0">
        <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center mb-1.5 overflow-hidden shrink-0">
          {schoolLogo ? (
            <img src={schoolLogo} alt="Logo de l'école" className="w-full h-full object-contain" />
          ) : (
            <GraduationCap className="w-5 h-5 text-sidebar-foreground" />
          )}
        </div>
        <h2 className="font-bold text-sm font-[family-name:var(--font-display)] text-center leading-tight line-clamp-2">{schoolName}</h2>
        <p className="text-[10px] text-sidebar-foreground/70">{user ? getRoleLabel(user.role) : ""}</p>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link key={item.label} to={item.to} onClick={onClose}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t border-sidebar-border shrink-0">
        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:flex sticky top-0 h-screen">{sidebarContent}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}

/** Barre de navigation horizontale scrollable (mobile) — affiche tous les modules du rôle. */
export function MobileNavStrip() {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role || "gestionnaire";
  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  return (
    <div className="md:hidden border-b border-border bg-card">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link key={item.label} to={item.to}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
