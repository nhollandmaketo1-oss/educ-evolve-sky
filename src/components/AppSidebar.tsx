import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, CreditCard, UserCog, Wallet, ClipboardCheck,
  BarChart3, FileText, Settings, LogOut, GraduationCap, User
} from "lucide-react";
import { type UserRole, getRoleLabel, logoutUser, getCurrentUser } from "@/lib/auth";

interface SidebarProps {
  onLogout: () => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

const allNavItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", to: "/", roles: ["dg", "de", "gestionnaire"] },
  { icon: Users, label: "Élèves", to: "/eleves", roles: ["dg", "de", "gestionnaire"] },
  { icon: CreditCard, label: "Paiements", to: "/paiements", roles: ["dg", "gestionnaire"] },
  { icon: UserCog, label: "Personnel", to: "/personnel", roles: ["dg", "de"] },
  { icon: Wallet, label: "Salaires", to: "/salaires", roles: ["dg", "gestionnaire"] },
  { icon: ClipboardCheck, label: "Présences", to: "/presences", roles: ["dg", "de"] },
  { icon: BarChart3, label: "Statistiques", to: "/statistiques", roles: ["dg", "de"] },
  { icon: FileText, label: "Rapports", to: "/rapports", roles: ["dg", "de"] },
  { icon: Settings, label: "Utilisateurs", to: "/utilisateurs", roles: ["dg"] },
  { icon: User, label: "Mon Profil", to: "/profil", roles: ["dg", "de", "gestionnaire"] },
];

export function AppSidebar({ onLogout, mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const user = getCurrentUser();
  const role = user?.role || "gestionnaire";
  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    logoutUser();
    onLogout();
  };

  const sidebarContent = (
    <aside className="flex flex-col bg-sidebar text-sidebar-foreground min-h-screen w-64">
      <div className="flex flex-col items-center py-6 px-4 border-b border-sidebar-border">
        <div className="w-14 h-14 rounded-full bg-sidebar-accent flex items-center justify-center mb-2">
          <GraduationCap className="w-7 h-7 text-sidebar-foreground" />
        </div>
        <h2 className="font-bold text-lg font-[family-name:var(--font-display)]">EDUC 2.0</h2>
        <p className="text-xs text-sidebar-foreground/70">{user ? getRoleLabel(user.role) : ""}</p>
      </div>

      <div className="px-4 pt-4 pb-1">
        <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold">Menu</span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={onClose}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex">{sidebarContent}</div>
      {/* Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
