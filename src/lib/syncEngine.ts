import { db, type SyncQueueItem } from "./offlineDb";
import { supabase } from "@/integrations/supabase/client";

type SyncListener = (state: SyncState) => void;

export interface SyncConflict {
  table: string;
  record_id: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  resolveWith: (choice: "local" | "server") => Promise<void>;
}

export interface SyncState {
  syncing: boolean;
  pendingCount: number;
  lastSync: string | null;
  conflicts: SyncConflict[];
  online: boolean;
}

let state: SyncState = {
  syncing: false,
  pendingCount: 0,
  lastSync: null,
  conflicts: [],
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
};

const listeners = new Set<SyncListener>();

function notify() {
  listeners.forEach((fn) => fn({ ...state }));
}

export function subscribeSyncState(fn: SyncListener): () => void {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}

export function getSyncState(): SyncState {
  return { ...state };
}

// Queue a change for later sync
export async function queueChange(
  table: string,
  operation: "insert" | "update" | "delete",
  record_id: string,
  data: Record<string, unknown> | null
) {
  await db.sync_queue.add({
    table,
    operation,
    record_id,
    data,
    created_at: new Date().toISOString(),
  });
  state.pendingCount = await db.sync_queue.count();
  notify();
}

// Strip local-only fields
function cleanRecord(data: Record<string, unknown> | null) {
  if (!data) return null;
  const { _synced, _updated_at, ...rest } = data;
  return rest;
}

// Push local changes to Supabase
async function pushChanges() {
  const items = await db.sync_queue.orderBy("id").toArray();
  if (items.length === 0) return;

  for (const item of items) {
    try {
      const clean = cleanRecord(item.data);
      if (item.operation === "insert" && clean) {
        const { error } = await supabase.from(item.table).upsert(clean as any);
        if (error) throw error;
      } else if (item.operation === "update" && clean) {
        // Check for conflicts
        const { data: serverRow } = await supabase
          .from(item.table)
          .select("*")
          .eq("id", item.record_id)
          .maybeSingle();

        if (serverRow && item.data?._updated_at) {
          const serverUpdated = serverRow.updated_at || serverRow.created_at;
          if (serverUpdated && new Date(serverUpdated) > new Date(item.data._updated_at as string)) {
            // Conflict detected
            await handleConflict(item, serverRow);
            continue;
          }
        }
        const { error } = await supabase.from(item.table).upsert(clean as any);
        if (error) throw error;
      } else if (item.operation === "delete") {
        const { error } = await supabase.from(item.table).delete().eq("id", item.record_id);
        if (error) throw error;
      }

      // Mark local record as synced
      const localTable = (db as any)[item.table];
      if (localTable && item.operation !== "delete") {
        const pk = item.table === "app_settings" ? "key" : "id";
        const pkVal = item.table === "app_settings" ? (item.data as any)?.key : item.record_id;
        await localTable.update(pkVal, { _synced: true });
      }

      await db.sync_queue.delete(item.id!);
    } catch (err) {
      console.error(`[Sync] Failed to push ${item.table}/${item.record_id}:`, err);
    }
  }
}

async function handleConflict(item: SyncQueueItem, serverRow: Record<string, unknown>) {
  return new Promise<void>((resolve) => {
    const conflict: SyncConflict = {
      table: item.table,
      record_id: item.record_id,
      localData: item.data || {},
      serverData: serverRow,
      resolveWith: async (choice) => {
        if (choice === "local") {
          const clean = cleanRecord(item.data);
          await supabase.from(item.table).upsert(clean as any);
        } else {
          // Server wins - update local
          const localTable = (db as any)[item.table];
          if (localTable) {
            await localTable.put({ ...serverRow, _synced: true });
          }
        }
        await db.sync_queue.delete(item.id!);
        state.conflicts = state.conflicts.filter((c) => c !== conflict);
        notify();
        resolve();
      },
    };
    state.conflicts.push(conflict);
    notify();
  });
}

// Pull latest data from Supabase into Dexie
async function pullAll() {
  const tables = ["students", "personnel", "payments", "attendance", "notifications", "grades", "app_settings"] as const;

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      if (!data) continue;

      const localTable = (db as any)[table];
      const enriched = data.map((row: any) => ({ ...row, _synced: true, _updated_at: row.updated_at || row.created_at || new Date().toISOString() }));

      // Only overwrite synced records, preserve unsynced local changes
      for (const row of enriched) {
        const pk = table === "app_settings" ? row.key : row.id;
        const existing = await localTable.get(pk);
        if (!existing || existing._synced !== false) {
          await localTable.put(row);
        }
      }
    } catch (err) {
      console.error(`[Sync] Failed to pull ${table}:`, err);
    }
  }
}

// Full sync cycle
export async function syncNow() {
  if (state.syncing || !navigator.onLine) return;

  state.syncing = true;
  notify();

  try {
    await pushChanges();
    await pullAll();
    state.lastSync = new Date().toISOString();
    state.pendingCount = await db.sync_queue.count();
  } catch (err) {
    console.error("[Sync] Error:", err);
  } finally {
    state.syncing = false;
    notify();
  }
}

// Auto-sync setup
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 30_000) {
  if (typeof window === "undefined") return;

  const handleOnline = () => {
    state.online = true;
    notify();
    syncNow();
  };
  const handleOffline = () => {
    state.online = false;
    notify();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  state.online = navigator.onLine;
  if (state.online) syncNow();

  syncInterval = setInterval(() => {
    if (navigator.onLine) syncNow();
  }, intervalMs);

  // Init pending count
  db.sync_queue.count().then((c) => {
    state.pendingCount = c;
    notify();
  });

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    if (syncInterval) clearInterval(syncInterval);
  };
}
