/**
 * Accès direct à la base Lovable Cloud depuis le navigateur (comportement
 * d'origine, partagé avec le tableau de bord). `sdb` est simplement le client
 * Supabase du navigateur : toutes les requêtes des modules restent valides.
 */
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "educ_session_token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface DbResult<T = any> {
  data: T | null;
  error: { message: string } | null;
}

/** Client de données direct (remplace l'ancien proxy serveur). */
export const sdb = supabase as any;

/** Upload direct dans un bucket de stockage. */
export async function uploadFile(
  bucket: "school-assets" | "message-attachments" | "staff-documents",
  path: string,
  file: File | Blob,
): Promise<{ url: string | null; error: string | null }> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: (file as File).type || "application/octet-stream",
  });
  if (error) return { url: null, error: error.message };

  if (bucket === "school-assets") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  }
  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  return { url: signed?.signedUrl ?? null, error: null };
}

export async function purgeBucket(bucket: string) {
  const { data: files } = await supabase.storage.from(bucket).list("", { limit: 1000 });
  const paths = (files || []).map((f) => f.name);
  if (paths.length) await supabase.storage.from(bucket).remove(paths);
}
