import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PersonnelModule } from "@/components/PersonnelModule";
export const Route = createFileRoute("/personnel")({ component: () => <AppLayout title="Personnel"><PersonnelModule /></AppLayout> });
