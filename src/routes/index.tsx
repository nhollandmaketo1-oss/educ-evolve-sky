import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DashboardContent } from "@/components/DashboardContent";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({ meta: [{ title: "EDUC 2.0 — Tableau de bord" }] }),
});

function Index() {
  return <AppLayout title="Tableau de bord"><DashboardContent /></AppLayout>;
}
