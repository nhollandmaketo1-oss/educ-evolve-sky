import { createServerFn } from "@tanstack/react-start";
import type { DbSpec } from "@/lib/db.server";

/** Generic, permission-checked data access. */
export const dbRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string | null; spec: DbSpec }) => d)
  .handler(async ({ data }) => {
    const { getSession, runDbSpec } = await import("@/lib/db.server");
    const session = await getSession(data.token);
    if (!session) return { data: null, error: { message: "Session expirée" } };
    return runDbSpec(data.spec, session);
  });

/** Credential login against app_users; issues a server-side session token. */
export const authLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { createSession } = await import("@/lib/db.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("*")
      .eq("username", data.username)
      .eq("password", data.password)
      .maybeSingle();
    if (!row) return { user: null, token: null };
    const token = await createSession(row.id as string, row.role as string);
    return { user: row as Record<string, unknown>, token };
  });

export const authLogout = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string | null }) => d)
  .handler(async ({ data }) => {
    const { destroySession } = await import("@/lib/db.server");
    if (data.token) await destroySession(data.token);
    return { ok: true };
  });

/** Current account for a session token (password never returned). */
export const authSessionUser = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string | null }) => d)
  .handler(async ({ data }) => {
    const { getSession } = await import("@/lib/db.server");
    const session = await getSession(data.token);
    if (!session) return { user: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("id, username, role, display_name, photo, poste, telephone")
      .eq("id", session.user_id)
      .maybeSingle();
    return { user: (row as Record<string, unknown>) ?? null };
  });

const BUCKET_WRITE_ROLES: Record<string, string[]> = {
  "school-assets": ["dg"],
  "message-attachments": ["dg", "de", "gestionnaire", "comptable", "parent"],
  "staff-documents": ["dg", "de", "comptable"],
};

/** Authenticated upload. Returns a public URL (school-assets) or a signed URL. */
export const storageUpload = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token: string | null;
    bucket: string;
    path: string;
    base64: string;
    contentType?: string;
  }) => d)
  .handler(async ({ data }) => {
    const { getSession } = await import("@/lib/db.server");
    const session = await getSession(data.token);
    if (!session) return { url: null, error: "Session expirée" };

    const roles = BUCKET_WRITE_ROLES[data.bucket];
    if (!roles || !roles.includes(session.role)) return { url: null, error: "Accès refusé" };
    if (data.bucket === "message-attachments" && !data.path.startsWith(`${session.user_id}/`)) {
      return { url: null, error: "Chemin non autorisé" };
    }

    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from(data.bucket)
      .upload(data.path, bytes, { upsert: true, contentType: data.contentType || "application/octet-stream" });
    if (error) return { url: null, error: error.message };

    if (data.bucket === "school-assets") {
      const { data: pub } = supabaseAdmin.storage.from(data.bucket).getPublicUrl(data.path);
      return { url: pub.publicUrl, error: null };
    }
    const { data: signed } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);
    return { url: signed?.signedUrl ?? null, error: null };
  });

/** Purge a bucket — reserved to the DG (used by the "reset data" action). */
export const storagePurge = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string | null; bucket: string }) => d)
  .handler(async ({ data }) => {
    const { getSession } = await import("@/lib/db.server");
    const session = await getSession(data.token);
    if (!session || session.role !== "dg") return { removed: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: files } = await supabaseAdmin.storage.from(data.bucket).list("", { limit: 1000 });
    const paths = (files || []).map((f) => f.name);
    if (paths.length) await supabaseAdmin.storage.from(data.bucket).remove(paths);
    return { removed: paths.length };
  });
