import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { StatistiquesModule } from "@/components/StatistiquesModule";
export const Route = createFileRoute("/statistiques")({ component: () => <AppLayout title="Statistiques"><StatistiquesModule /></AppLayout> });
