import { supabase } from "@/integrations/supabase/client";

export type UserRole = "dg" | "de" | "gestionnaire";

export interface AppUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  display_name: string;
  photo?: string | null;
}

// Session stored in memory (client-side only)
let currentUserId: string | null = null;

export function initSession() {
  if (typeof window === "undefined") return;
  currentUserId = sessionStorage.getItem("educ_current_user");
}

export async function authenticate(username: string, password: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .maybeSingle();
  if (error || !data) return null;
  return mapUser(data);
}

export async function getCurrentUserAsync(): Promise<AppUser | null> {
  if (typeof window === "undefined") return null;
  if (!currentUserId) {
    currentUserId = sessionStorage.getItem("educ_current_user");
  }
  if (!currentUserId) return null;
  const { data } = await supabase.from("app_users").select("*").eq("id", currentUserId).maybeSingle();
  if (!data) return null;
  return mapUser(data);
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
}

export function logoutUser() {
  if (typeof window === "undefined") return;
  currentUserId = null;
  sessionStorage.removeItem("educ_current_user");
}

export async function updateUser(userId: string, updates: { username?: string; password?: string; display_name?: string; photo?: string }): Promise<AppUser | null> {
  const { data, error } = await supabase.from("app_users").update(updates).eq("id", userId).select().maybeSingle();
  if (error || !data) return null;
  return mapUser(data);
}

export async function getAllUsers(): Promise<AppUser[]> {
  const { data } = await supabase.from("app_users").select("*").order("created_at");
  return (data || []).map(mapUser);
}

export async function createUser(user: { username: string; password: string; display_name: string; role: UserRole }): Promise<AppUser | null> {
  const { data, error } = await supabase.from("app_users").insert(user).select().maybeSingle();
  if (error || !data) return null;
  return mapUser(data);
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "dg": return "Directeur Général";
    case "de": return "Directeur d'Études";
    case "gestionnaire": return "Gestionnaire";
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
  };
}
