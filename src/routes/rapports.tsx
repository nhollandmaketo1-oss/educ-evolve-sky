import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { RapportsModule } from "@/components/RapportsModule";
export const Route = createFileRoute("/rapports")({ component: () => <AppLayout title="Rapports"><RapportsModule /></AppLayout> });
