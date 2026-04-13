import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { NotesModule } from "@/components/NotesModule";
export const Route = createFileRoute("/notes")({ component: () => <AppLayout title="Notes Scolaires"><NotesModule /></AppLayout> });
