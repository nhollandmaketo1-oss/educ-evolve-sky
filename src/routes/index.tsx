import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";
import { LoginPage } from "@/components/LoginPage";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { DashboardContent } from "@/components/DashboardContent";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "EDUC 2.0 — Système de Gestion Scolaire" },
      { name: "description", content: "EDUC 2.0 — Système de Gestion Scolaire" },
    ],
  }),
});

function Index() {
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const user = getCurrentUser();
  const [mobileMenu, setMobileMenu] = useState(false);

  if (!user) return <LoginPage onLogin={refresh} />;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar onLogout={refresh} mobileOpen={mobileMenu} onClose={() => setMobileMenu(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Tableau de bord" onMenuToggle={() => setMobileMenu(!mobileMenu)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <DashboardContent />
        </main>
      </div>
    </div>
  );
}
