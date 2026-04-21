import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ParametresModule } from "@/components/ParametresModule";

export const Route = createFileRoute("/parametres")({
  component: ParametresPage,
  head: () => ({ meta: [{ title: "EDUC 2.0 — Paramètres de l'application" }] }),
});

function ParametresPage() {
  return (
    <AppLayout title="Paramètres de l'application" requireRole={["dg"]}>
      <ParametresModule />
    </AppLayout>
  );
}
