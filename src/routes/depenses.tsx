import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DepensesModule } from "@/components/DepensesModule";
export const Route = createFileRoute("/depenses")({
  component: () => (
    <AppLayout title="Gestion des dépenses" requireRole={["dg", "comptable"]}>
      <DepensesModule />
    </AppLayout>
  ),
});
