import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/offlineDb";

/** Race a promise against a timeout — rejects if the promise doesn't settle in time */
function withTimeout<T>(promise: PromiseLike<T>, ms = 5000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

export type UserRole = "dg" | "de" | "gestionnaire" | "comptable";

export interface AppUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  display_name: string;
  photo?: string | null;
  poste?: string | null;
  telephone?: string | null;
}

// Session stored in memory (client-side only)
let currentUserId: string | null = null;

export function initSession() {
  if (typeof window === "undefined") return;
  currentUserId = sessionStorage.getItem("educ_current_user");
}

/** Cache a user locally in Dexie for offline access */
async function cacheUserLocally(user: AppUser) {
  try {
    await db.app_users.put({ ...user, _synced: true, _updated_at: new Date().toISOString() });
  } catch (e) {
    console.warn("[Auth] Failed to cache user locally:", e);
  }
}

export async function authenticate(username: string, password: string): Promise<AppUser | null> {
  // Try Supabase first
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("app_users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .maybeSingle()
    );
    if (!error && data) {
      const user = mapUser(data);
      await cacheUserLocally(user);
      return user;
    }
  } catch {
    // Network error — try offline
  }

  // Fallback: check Dexie
  const local = await db.app_users.where("username").equals(username).first();
  if (local && local.password === password) {
    return mapUser(local as unknown as Record<string, unknown>);
  }
  return null;
}

export async function getCurrentUserAsync(): Promise<AppUser | null> {
  if (typeof window === "undefined") return null;
  if (!currentUserId) {
    currentUserId = sessionStorage.getItem("educ_current_user");
  }
  if (!currentUserId) return null;

  // Try Supabase first
  try {
    const { data, error } = await withTimeout(
      supabase.from("app_users").select("*").eq("id", currentUserId).maybeSingle()
    );
    if (!error && data) {
      const user = mapUser(data);
      await cacheUserLocally(user);
      return user;
    }
  } catch {
    // Network error — try offline
  }

  // Fallback: Dexie
  const local = await db.app_users.get(currentUserId);
  if (local) return mapUser(local as unknown as Record<string, unknown>);

  return null;
}

export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  if (!currentUserId) currentUserId = sessionStorage.getItem("educ_current_user");
  return currentUserId;
}

export function loginUser(user: AppUser) {
  if (typeof window === "undefined") return;
  currentUserId = user.id;
  sessionStorage.setItem("educ_current_user", user.id);
  // Also cache locally
  cacheUserLocally(user);
}

export function logoutUser() {
  if (typeof window === "undefined") return;
  currentUserId = null;
  sessionStorage.removeItem("educ_current_user");
}

export async function updateUser(userId: string, updates: { username?: string; password?: string; display_name?: string; photo?: string; poste?: string; telephone?: string }): Promise<AppUser | null> {
  const { data, error } = await supabase.from("app_users").update(updates).eq("id", userId).select().maybeSingle();
  if (error || !data) return null;
  const user = mapUser(data);
  await cacheUserLocally(user);
  return user;
}

export async function getAllUsers(): Promise<AppUser[]> {
  try {
    const { data } = await supabase.from("app_users").select("*").order("created_at");
    if (data) {
      const users = data.map(mapUser);
      // Cache all users locally
      for (const u of users) await cacheUserLocally(u);
      return users;
    }
  } catch {
    // Offline
  }
  // Fallback
  const locals = await db.app_users.toArray();
  return locals.map((r) => mapUser(r as unknown as Record<string, unknown>));
}

export async function createUser(user: { username: string; password: string; display_name: string; role: UserRole; photo?: string | null; poste?: string; telephone?: string }): Promise<AppUser | null> {
  const { data, error } = await supabase.from("app_users").insert(user).select().maybeSingle();
  if (error || !data) return null;
  const created = mapUser(data);
  await cacheUserLocally(created);
  return created;
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "dg": return "Directeur Général";
    case "de": return "Directeur d'Études";
    case "gestionnaire": return "Gestionnaire";
    case "comptable": return "Comptable";
  }
}

function mapUser(row: Record<string, unknown>): AppUser {
  return {
    id: row.id as string,
    username: row.username as string,
    password: row.password as string,
    role: row.role as UserRole,
    display_name: row.display_name as string,
    photo: row.photo as string | null,
    poste: row.poste as string | null,
    telephone: row.telephone as string | null,
  };
}
