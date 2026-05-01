import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CloudOff, Check, AlertTriangle } from "lucide-react";
import { subscribeSyncState, syncNow, type SyncState, type SyncConflict } from "@/lib/syncEngine";

function ConflictDialog({ conflict }: { conflict: SyncConflict }) {
  const TABLE_LABELS: Record<string, string> = {
    students: "Élève", personnel: "Personnel", payments: "Paiement",
    attendance: "Présence", grades: "Note", notifications: "Notification",
    app_settings: "Paramètre",
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
  const [syncState, setSyncState] = useState<SyncState>({
    syncing: false, pendingCount: 0, lastSync: null, conflicts: [], online: true,
  });

  useEffect(() => subscribeSyncState(setSyncState), []);

  const firstConflict = syncState.conflicts[0];

  return (
    <>
      {firstConflict && <ConflictDialog conflict={firstConflict} />}

      {!syncState.online && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-medium py-1.5 px-4">
          <WifiOff className="h-4 w-4" />
          <span>Hors ligne — les modifications sont sauvegardées localement</span>
          {syncState.pendingCount > 0 && (
            <span className="ml-2 bg-white/20 rounded-full px-2 py-0.5 text-xs">
              {syncState.pendingCount} en attente
            </span>
          )}
        </div>
      )}

      {syncState.online && syncState.pendingCount > 0 && !syncState.syncing && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-blue-500 text-white text-sm font-medium py-1.5 px-4">
          <CloudOff className="h-4 w-4" />
          <span>{syncState.pendingCount} modification(s) en attente</span>
          <button onClick={syncNow} className="ml-2 bg-white/20 rounded-full px-3 py-0.5 text-xs hover:bg-white/30 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Synchroniser
          </button>
        </div>
      )}

      {syncState.syncing && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-green-500 text-white text-sm font-medium py-1.5 px-4">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Synchronisation en cours…</span>
        </div>
      )}
    </>
  );
}
