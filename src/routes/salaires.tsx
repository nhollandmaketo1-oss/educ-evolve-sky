import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { SalairesModule } from "@/components/SalairesModule";
export const Route = createFileRoute("/salaires")({ component: () => <AppLayout title="Salaires"><SalairesModule /></AppLayout> });
