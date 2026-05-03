import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { subscribeSyncState, syncNow, type SyncState, type SyncConflict } from "@/lib/syncEngine";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

function ConflictDialog({ conflict }: { conflict: SyncConflict }) {
  const TABLE_LABELS: Record<string, string> = {
    students: "Élève", personnel: "Personnel", payments: "Paiement",
    attendance: "Présence", grades: "Note", notifications: "Notification",
    app_settings: "Paramètre", messages: "Message",
  };

  return (
    <div className="fixed inset-0 bg-foreground/40 z-[10000] flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-bold text-lg">Conflit de données</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Un enregistrement <strong>{TABLE_LABELS[conflict.table] || conflict.table}</strong> a été modifié à la fois en local et sur le serveur. Quelle version garder ?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => conflict.resolveWith("local")}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            Ma version locale
          </button>
          <button
            onClick={() => conflict.resolveWith("server")}
            className="px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:opacity-90 border border-border"
          >
            Version serveur
          </button>
        </div>
      </div>
    </div>
  );
}

export function OfflineBanner() {
  const prevOnline = useRef<boolean | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);

  // Toast on connectivity change
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      if (prevOnline.current === false) {
        toast.success("Connexion rétablie", {
          description: "Synchronisation en cours…",
          duration: 3000,
        });
        syncNow();
      }
      prevOnline.current = true;
    };
    const handleOffline = () => {
      prevOnline.current = false;
      toast.warning("Hors ligne", {
        description: "Les modifications sont sauvegardées localement",
        duration: 4000,
      });
    };

    // Set initial state without toasting
    prevOnline.current = navigator.onLine;

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Subscribe to conflicts only
  useEffect(() => {
    return subscribeSyncState((s: SyncState) => {
      setConflict(s.conflicts[0] || null);
    });
  }, []);

  return conflict ? <ConflictDialog conflict={conflict} /> : null;
}
