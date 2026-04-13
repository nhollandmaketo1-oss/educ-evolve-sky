import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ElevesModule } from "@/components/ElevesModule";
export const Route = createFileRoute("/eleves")({ component: () => <AppLayout title="Élèves"><ElevesModule /></AppLayout> });
