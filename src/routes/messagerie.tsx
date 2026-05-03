import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { lazy, Suspense } from "react";

const MessagerieModule = lazy(() => import("@/components/MessagerieModule"));

export const Route = createFileRoute("/messagerie")({
  component: MessageriePage,
});

function MessageriePage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
        <MessagerieModule />
      </Suspense>
    </AppLayout>
  );
}
