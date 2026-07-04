import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { RapportsFinanciersModule } from "@/components/RapportsFinanciersModule";
export const Route = createFileRoute("/rapports-financiers")({
  component: () => (
    <AppLayout title="Rapports financiers" requireRole={["dg", "comptable"]}>
      <RapportsFinanciersModule />
    </AppLayout>
  ),
});
