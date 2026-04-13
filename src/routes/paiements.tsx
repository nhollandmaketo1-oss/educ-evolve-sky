import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PaiementsModule } from "@/components/PaiementsModule";
export const Route = createFileRoute("/paiements")({ component: () => <AppLayout title="Paiements"><PaiementsModule /></AppLayout> });
