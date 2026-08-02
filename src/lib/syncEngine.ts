import { db, type SyncQueueItem } from "./offlineDb";
import { sdb, getSessionToken } from "@/lib/secureDb";

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

function cleanRecord(data: Record<string, unknown> | null) {
  if (!data) return null;
  const { _synced, _updated_at, ...rest } = data;
  return rest;
}

async function pushChanges() {
  const items = await db.sync_queue.orderBy("id").toArray();
  if (items.length === 0) return;

  for (const item of items) {
    try {
      const clean = cleanRecord(item.data);
      if (item.operation === "insert" && clean) {
        const { error } = await sdb.from(item.table).upsert(clean as Record<string, unknown>);
        if (error) throw error;
      } else if (item.operation === "update" && clean) {
        const { data: serverRow } = await sdb.from(item.table)
          .select("*")
          .eq("id", item.record_id)
          .maybeSingle();

        if (serverRow && item.data?._updated_at) {
          const serverUpdated = (serverRow as any).updated_at || (serverRow as any).created_at;
          if (serverUpdated && new Date(serverUpdated) > new Date(item.data._updated_at as string)) {
            await handleConflict(item, serverRow);
            continue;
          }
        }
        const { error } = await sdb.from(item.table).upsert(clean as Record<string, unknown>);
        if (error) throw error;
      } else if (item.operation === "delete") {
        const { error } = await sdb.from(item.table).delete().eq("id", item.record_id);
        if (error) throw error;
      }

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
          await sdb.from(item.table).upsert(clean as Record<string, unknown>);
        } else {
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

async function pullAll() {
  const tables = ["students", "personnel", "payments", "attendance", "notifications", "grades", "app_settings", "app_users"] as const;

  for (const table of tables) {
    try {
      const { data, error } = await sdb.from(table).select("*");
      if (error) throw error;
      if (!data) continue;

      const localTable = (db as any)[table];
      const enriched = (data as any[]).map((row: any) => ({
        ...row,
        _synced: true,
        _updated_at: row.updated_at || row.created_at || new Date().toISOString(),
      }));

      for (const row of enriched) {
        const pk = table === "app_settings" ? row.key : row.id;
        const existing = await localTable.get(pk);
        if (table === "app_users" && existing?.password && !row.password) {
          // le serveur ne renvoie jamais les mots de passe : conserver le cache local (connexion hors ligne)
          row.password = existing.password;
        }
        if (!existing || existing._synced !== false) {
          await localTable.put(row);
        }
      }
    } catch (err) {
      console.error(`[Sync] Failed to pull ${table}:`, err);
    }
  }
}

export async function syncNow() {
  if (state.syncing || !navigator.onLine) return;
  if (!getSessionToken()) return; // pas de session : aucun accès serveur

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
