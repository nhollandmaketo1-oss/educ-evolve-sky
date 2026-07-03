import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ProfilsContratsModule } from "@/components/ProfilsContratsModule";
export const Route = createFileRoute("/profils-contrats")({
  component: () => (
    <AppLayout title="Profils & Contrats" requireRole={["dg", "de", "comptable"]}>
      <ProfilsContratsModule />
    </AppLayout>
  ),
});
