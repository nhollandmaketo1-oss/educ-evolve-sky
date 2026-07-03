import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { EvaluationPerformanceModule } from "@/components/EvaluationPerformanceModule";
export const Route = createFileRoute("/evaluations")({
  component: () => (
    <AppLayout title="Évaluation de performance" requireRole={["dg", "de"]}>
      <EvaluationPerformanceModule />
    </AppLayout>
  ),
});
