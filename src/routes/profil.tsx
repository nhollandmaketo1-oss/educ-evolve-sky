import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ProfilModule } from "@/components/ProfilModule";
export const Route = createFileRoute("/profil")({ component: () => <AppLayout title="Mon Profil"><ProfilModule /></AppLayout> });
