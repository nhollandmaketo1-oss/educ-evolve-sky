/**
 * Server-only data access layer.
 *
 * The application uses its own credential system (app_users) instead of
 * Supabase Auth, so no browser client may talk to the Data API directly.
 * Every table is locked down (RLS enabled, no policies, no anon grants) and
 * all reads/writes go through this module, which:
 *   1. validates the caller's session token (public.app_sessions),
 *   2. checks the table/action against a role permission matrix,
 *   3. injects mandatory row-level scoping (parents, messages, own account).
 */

export type FilterOp = "eq" | "neq" | "ilike" | "in" | "not_in" | "is" | "or" | "gte" | "lte";

export interface Filter {
  op: FilterOp;
  col?: string;
  val?: unknown;
  raw?: string;
}

export interface DbSpec {
  table: string;
  action: "select" | "insert" | "update" | "delete" | "upsert";
  columns?: string;
  values?: Record<string, unknown> | Record<string, unknown>[];
  onConflict?: string;
  filters?: Filter[];
  order?: { col: string; ascending: boolean };
  limit?: number;
  single?: boolean;
  returning?: boolean;
}

export interface Session {
  user_id: string;
  role: string;
}

const STAFF = ["dg", "de", "gestionnaire", "comptable"];
const ALL = [...STAFF, "parent"];

/** read = roles allowed to select, write = roles allowed to insert/update/delete */
const PERMISSIONS: Record<string, { read: string[]; write: string[] }> = {
  students: { read: [...STAFF, "parent"], write: ["dg", "de", "gestionnaire"] },
  personnel: { read: ["dg", "de", "comptable"], write: ["dg", "de"] },
  payments: { read: [...STAFF, "parent"], write: ["dg", "gestionnaire", "comptable"] },
  attendance: { read: ["dg", "de"], write: ["dg", "de"] },
  grades: { read: ["dg", "de", "parent"], write: ["dg", "de"] },
  notifications: { read: ALL, write: STAFF },
  app_settings: { read: ALL, write: ["dg"] },
  app_users: { read: ALL, write: ["dg", "de", "gestionnaire"] },
  class_fees: { read: [...STAFF, "parent"], write: ["dg", "comptable"] },
  invoices: { read: [...STAFF, "parent"], write: ["dg", "comptable", "gestionnaire"] },
  contracts: { read: ["dg", "de", "comptable"], write: ["dg", "de"] },
  staff_documents: { read: ["dg", "de", "comptable"], write: ["dg", "de"] },
  performance_evaluations: { read: ["dg", "de"], write: ["dg", "de"] },
  expenses: { read: ["dg", "comptable"], write: ["dg", "comptable"] },
  expense_categories: { read: ["dg", "comptable"], write: ["dg", "comptable"] },
  messages: { read: ALL, write: ALL },
};

export const BUCKETS = {
  SCHOOL: "school-assets",
  MESSAGES: "message-attachments",
  STAFF: "staff-documents",
} as const;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getSession(token: string | null | undefined): Promise<Session | null> {
  if (!token) return null;
  const sb = await admin();
  const { data } = await sb
    .from("app_sessions")
    .select("user_id, role, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at as string) < new Date()) {
    await sb.from("app_sessions").delete().eq("token", token);
    return null;
  }
  return { user_id: data.user_id as string, role: data.role as string };
}

export async function createSession(userId: string, role: string): Promise<string> {
  const sb = await admin();
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  await sb.from("app_sessions").insert({ token, user_id: userId, role });
  return token;
}

export async function destroySession(token: string) {
  if (!token) return;
  const sb = await admin();
  await sb.from("app_sessions").delete().eq("token", token);
}

/** ids of the students attached to a parent account */
async function childIds(parentUserId: string): Promise<string[]> {
  const sb = await admin();
  const { data } = await sb.from("students").select("id").eq("parent_user_id", parentUserId);
  return (data || []).map((r) => r.id as string);
}

function stripSecrets(table: string, rows: unknown): unknown {
  if (table !== "app_users" || !rows) return rows;
  const clean = (r: Record<string, unknown>) => {
    const { password: _password, ...rest } = r;
    return rest;
  };
  if (Array.isArray(rows)) return rows.map((r) => clean(r as Record<string, unknown>));
  return clean(rows as Record<string, unknown>);
}

/** Row scoping that the client cannot opt out of. */
async function scopeFilters(spec: DbSpec, session: Session): Promise<Filter[] | { error: string }> {
  const extra: Filter[] = [];
  const { table, action } = spec;
  const isRead = action === "select";

  if (table === "messages") {
    if (isRead) {
      extra.push({ op: "or", raw: `sender_id.eq.${session.user_id},receiver_id.eq.${session.user_id}` });
    } else if (action === "insert" || action === "upsert") {
      const rows = Array.isArray(spec.values) ? spec.values : [spec.values || {}];
      for (const r of rows) {
        if (r.sender_id !== session.user_id) return { error: "Expéditeur invalide" };
      }
    } else {
      extra.push({ op: "or", raw: `sender_id.eq.${session.user_id},receiver_id.eq.${session.user_id}` });
    }
    return extra;
  }

  if (table === "app_users" && action !== "select" && session.role !== "dg") {
    if (action === "update") {
      // non-DG may only edit their own account
      extra.push({ op: "eq", col: "id", val: session.user_id });
    } else if (action === "insert" || action === "upsert") {
      const rows = Array.isArray(spec.values) ? spec.values : [spec.values || {}];
      for (const r of rows) {
        if (r.role !== "parent") return { error: "Création de compte non autorisée" };
      }
    } else {
      return { error: "Suppression de compte non autorisée" };
    }
  }

  if (session.role === "parent") {
    if (!isRead && table !== "app_users") return { error: "Accès en écriture refusé" };
    if (table === "students") extra.push({ op: "eq", col: "parent_user_id", val: session.user_id });
    if (table === "grades" || table === "payments" || table === "invoices") {
      extra.push({ op: "in", col: "student_id", val: await childIds(session.user_id) });
    }
    if (table === "notifications") extra.push({ op: "in", col: "target_role", val: ["all", "parent"] });
    if (table === "app_users") extra.push({ op: "eq", col: "id", val: session.user_id });
  }

  return extra;
}

function applyFilters(query: unknown, filters: Filter[]) {
  let q = query as Record<string, (...args: unknown[]) => unknown>;
  for (const f of filters) {
    switch (f.op) {
      case "or":
        q = (q.or as (s: string) => typeof q)(f.raw || "");
        break;
      case "in":
        q = (q.in as (c: string, v: unknown[]) => typeof q)(f.col!, (f.val as unknown[]) || []);
        break;
      case "not_in":
        q = (q.not as (c: string, op: string, v: unknown) => typeof q)(f.col!, "in", f.val);
        break;
      case "is":
        q = (q.is as (c: string, v: unknown) => typeof q)(f.col!, f.val);
        break;
      default:
        q = (q[f.op] as (c: string, v: unknown) => typeof q)(f.col!, f.val);
    }
  }
  return q;
}

export async function runDbSpec(spec: DbSpec, session: Session) {
  const perm = PERMISSIONS[spec.table];
  if (!perm) return { data: null, error: { message: `Table non autorisée: ${spec.table}` } };

  const needed = spec.action === "select" ? perm.read : perm.write;
  if (!needed.includes(session.role)) {
    return { data: null, error: { message: "Accès refusé pour ce rôle" } };
  }

  const scoped = await scopeFilters(spec, session);
  if (!Array.isArray(scoped)) return { data: null, error: { message: scoped.error } };

  const filters = [...(spec.filters || []), ...scoped];
  const sb = await admin();
  const table = (sb.from as unknown as (t: string) => Record<string, (...a: unknown[]) => unknown>)(spec.table);

  let q: unknown;
  switch (spec.action) {
    case "select":
      q = (table.select as (c: string) => unknown)(spec.columns || "*");
      q = applyFilters(q, filters);
      if (spec.order) {
        q = ((q as Record<string, unknown>).order as (c: string, o: unknown) => unknown)(
          spec.order.col,
          { ascending: spec.order.ascending },
        );
      }
      if (spec.limit) q = ((q as Record<string, unknown>).limit as (n: number) => unknown)(spec.limit);
      break;
    case "insert":
      q = (table.insert as (v: unknown) => unknown)(spec.values);
      if (spec.returning) q = ((q as Record<string, unknown>).select as () => unknown)();
      break;
    case "upsert":
      q = (table.upsert as (v: unknown, o?: unknown) => unknown)(
        spec.values,
        spec.onConflict ? { onConflict: spec.onConflict } : undefined,
      );
      if (spec.returning) q = ((q as Record<string, unknown>).select as () => unknown)();
      break;
    case "update":
      q = (table.update as (v: unknown) => unknown)(spec.values);
      q = applyFilters(q, filters);
      if (spec.returning) q = ((q as Record<string, unknown>).select as () => unknown)();
      break;
    case "delete":
      q = (table.delete as () => unknown)();
      q = applyFilters(q, filters);
      if (spec.returning) q = ((q as Record<string, unknown>).select as () => unknown)();
      break;
  }

  if (spec.single) q = ((q as Record<string, unknown>).maybeSingle as () => unknown)();

  const res = (await q) as { data: unknown; error: { message: string } | null };
  return { data: stripSecrets(spec.table, res.data) ?? null, error: res.error ? { message: res.error.message } : null };
}
