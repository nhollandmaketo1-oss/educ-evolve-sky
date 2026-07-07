import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/offlineDb";

function withTimeout<T>(promise: PromiseLike<T>, ms = 5000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export type UserRole = "dg" | "de" | "gestionnaire" | "comptable" | "parent";

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

let currentUserId: string | null = null;

export function initSession() {
  if (typeof window === "undefined") return;
  currentUserId = sessionStorage.getItem("educ_current_user");
}

/** Normalize phone → digits only (used as parent username). */
export function normalizePhone(raw: string | null | undefined): string {
  return (raw || "").replace(/\D+/g, "");
}

async function cacheUserLocally(user: AppUser) {
  try {
    await db.app_users.put({ ...user, _synced: true, _updated_at: new Date().toISOString() });
  } catch (e) {
    console.warn("[Auth] Failed to cache user locally:", e);
  }
}

export async function authenticate(username: string, password: string): Promise<AppUser | null> {
  const normalized = normalizePhone(username);
  const candidates = normalized && normalized !== username ? [username, normalized] : [username];

  for (const uname of candidates) {
    try {
      const { data, error } = await withTimeout(
        supabase.from("app_users").select("*").eq("username", uname).eq("password", password).maybeSingle()
      );
      if (!error && data) {
        const user = mapUser(data);
        await cacheUserLocally(user);
        return user;
      }
    } catch { /* offline */ }
  }

  // Offline fallback
  for (const uname of candidates) {
    const local = await db.app_users.where("username").equals(uname).first();
    if (local && local.password === password) return mapUser(local as unknown as Record<string, unknown>);
  }
  return null;
}

export async function getCurrentUserAsync(): Promise<AppUser | null> {
  if (typeof window === "undefined") return null;
  if (!currentUserId) currentUserId = sessionStorage.getItem("educ_current_user");
  if (!currentUserId) return null;

  try {
    const { data, error } = await withTimeout(
      supabase.from("app_users").select("*").eq("id", currentUserId).maybeSingle()
    );
    if (!error && data) {
      const user = mapUser(data);
      await cacheUserLocally(user);
      return user;
    }
  } catch { /* offline */ }

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
      for (const u of users) await cacheUserLocally(u);
      return users;
    }
  } catch { /* offline */ }
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

/**
 * Ensure a parent user exists for a given phone number. Idempotent.
 * Returns the parent's app_user id (or null if the phone is empty).
 */
export async function ensureParentUser(phoneRaw: string | null | undefined, displayName: string): Promise<string | null> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return null;
  try {
    const { data: existing } = await supabase
      .from("app_users").select("id").eq("username", phone).maybeSingle();
    if (existing?.id) return existing.id as string;
    const { data: created, error } = await supabase.from("app_users").insert({
      username: phone,
      password: "2026",
      role: "parent",
      display_name: `Parent — ${displayName}`,
      telephone: phone,
    }).select("id").maybeSingle();
    if (error) { console.warn("[Auth] ensureParentUser insert failed", error); return null; }
    return created?.id as string ?? null;
  } catch (e) {
    console.warn("[Auth] ensureParentUser failed", e);
    return null;
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "dg": return "Directeur Général";
    case "de": return "Directeur d'Études";
    case "gestionnaire": return "Gestionnaire";
    case "comptable": return "Comptable";
    case "parent": return "Parent";
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
