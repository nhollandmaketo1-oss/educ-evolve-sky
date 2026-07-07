import { useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/components/LoginPage";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { ParentDashboard } from "@/components/ParentDashboard";
import { generatePaymentReminders } from "@/lib/feesStore";

interface AppLayoutProps {
  title: string;
  children: ReactNode;
  requireRole?: string[];
}

export function AppLayout({ title, children, requireRole }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);

  // Déclenche la génération de rappels de paiement lors de la connexion DG/comptable/gestionnaire
  useEffect(() => {
    if (!user) return;
    if (["dg", "comptable", "gestionnaire"].includes(user.role)) {
      generatePaymentReminders().catch(() => { /* silent */ });
    }
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  if (!user) return <LoginPage />;

  // Rôle parent → interface dédiée simplifiée
  if (user.role === "parent") return <ParentDashboard />;

  if (requireRole && !requireRole.includes(user.role)) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Accès non autorisé</p></div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar mobileOpen={mobileMenu} onClose={() => setMobileMenu(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} onMenuToggle={() => setMobileMenu(!mobileMenu)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
