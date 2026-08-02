/**
 * Client-side query builder that mirrors the small subset of the PostgREST
 * builder used by the app, but routes every call through the permission-checked
 * `dbRequest` server function. No table is reachable from the browser directly.
 */
import { dbRequest, storageUpload, storagePurge } from "@/lib/data.functions";
import type { DbSpec, Filter } from "@/lib/db.server";

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

export interface DbResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

class Builder<T = unknown> implements PromiseLike<DbResult<T>> {
  private spec: DbSpec;

  constructor(spec: DbSpec) {
    this.spec = spec;
  }

  private push(f: Filter) {
    this.spec.filters = [...(this.spec.filters || []), f];
    return this;
  }

  eq(col: string, val: unknown) { return this.push({ op: "eq", col, val }); }
  neq(col: string, val: unknown) { return this.push({ op: "neq", col, val }); }
  ilike(col: string, val: unknown) { return this.push({ op: "ilike", col, val }); }
  in(col: string, val: unknown[]) { return this.push({ op: "in", col, val }); }
  is(col: string, val: unknown) { return this.push({ op: "is", col, val }); }
  gte(col: string, val: unknown) { return this.push({ op: "gte", col, val }); }
  lte(col: string, val: unknown) { return this.push({ op: "lte", col, val }); }
  or(raw: string) { return this.push({ op: "or", raw }); }
  not(col: string, op: string, val: unknown) {
    if (op === "in") return this.push({ op: "not_in", col, val });
    return this.push({ op: "neq", col, val });
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.spec.order = { col, ascending: opts?.ascending !== false };
    return this;
  }

  limit(n: number) { this.spec.limit = n; return this; }

  select(columns = "*") {
    if (this.spec.action === "select") this.spec.columns = columns;
    else this.spec.returning = true;
    return this;
  }

  maybeSingle() { this.spec.single = true; return this as unknown as Builder<T>; }
  single() { return this.maybeSingle(); }

  async run(): Promise<DbResult<T>> {
    const token = getSessionToken();
    try {
      const res = await dbRequest({ data: { token, spec: this.spec } });
      return res as DbResult<T>;
    } catch (e) {
      return { data: null, error: { message: (e as Error).message || "Réseau indisponible" } };
    }
  }

  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

function table(name: string) {
  return {
    select: (columns = "*") => new Builder({ table: name, action: "select", columns, filters: [] }),
    insert: (values: Record<string, unknown> | Record<string, unknown>[]) =>
      new Builder({ table: name, action: "insert", values, filters: [] }),
    upsert: (values: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }) =>
      new Builder({ table: name, action: "upsert", values, onConflict: opts?.onConflict, filters: [] }),
    update: (values: Record<string, unknown>) =>
      new Builder({ table: name, action: "update", values, filters: [] }),
    delete: () => new Builder({ table: name, action: "delete", filters: [] }),
  };
}

/** Drop-in replacement for the browser Supabase Data API client. */
export const sdb = { from: table };

async function fileToBase64(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i += 8192) {
    binary += String.fromCharCode(...buf.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/** Authenticated upload through the server (buckets are closed to the browser). */
export async function uploadFile(
  bucket: "school-assets" | "message-attachments" | "staff-documents",
  path: string,
  file: File | Blob,
): Promise<{ url: string | null; error: string | null }> {
  const base64 = await fileToBase64(file);
  const res = await storageUpload({
    data: {
      token: getSessionToken(),
      bucket,
      path,
      base64,
      contentType: (file as File).type || "application/octet-stream",
    },
  });
  return res;
}

export async function purgeBucket(bucket: string) {
  await storagePurge({ data: { token: getSessionToken(), bucket } });
}
