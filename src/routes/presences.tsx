import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PresencesModule } from "@/components/PresencesModule";
export const Route = createFileRoute("/presences")({ component: () => <AppLayout title="Présences"><PresencesModule /></AppLayout> });
