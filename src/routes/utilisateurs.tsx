import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { UtilisateursModule } from "@/components/UtilisateursModule";
export const Route = createFileRoute("/utilisateurs")({ component: () => <AppLayout title="Utilisateurs" requireRole={["dg"]}><UtilisateursModule /></AppLayout> });
