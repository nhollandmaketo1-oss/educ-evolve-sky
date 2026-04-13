import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { ElevesModule } from "@/components/ElevesModule";

export const Route = createFileRoute("/eleves")({
  component: ElevesPage,
});

function ElevesPage() {
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);

  if (!user) { navigate({ to: "/" }); return null; }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar onLogout={refresh} mobileOpen={mobileMenu} onClose={() => setMobileMenu(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Élèves" onMenuToggle={() => setMobileMenu(!mobileMenu)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto"><ElevesModule /></main>
      </div>
    </div>
  );
}
