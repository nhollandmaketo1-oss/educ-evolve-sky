import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { FraisScolariteModule } from "@/components/FraisScolariteModule";
export const Route = createFileRoute("/frais-scolarite")({
  component: () => (
    <AppLayout title="Frais de scolarité & factures" requireRole={["dg", "comptable"]}>
      <FraisScolariteModule />
    </AppLayout>
  ),
});
