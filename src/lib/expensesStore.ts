/**
 * Expenses store: dépenses et catégories.
 * Supabase-direct (no offline queue yet). Justificatifs uploadés dans le bucket public school-assets/expenses.
 */
import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  date_depense: string;
  categorie: string;
  fournisseur: string | null;
  description: string;
  montant: number;
  mode_paiement: string;
  reference: string | null;
  justificatif_url: string | null;
  statut: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseCategory {
  id: string;
  nom: string;
  description: string | null;
}

// ─── Categories ───
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase.from("expense_categories").select("*").order("nom");
  if (error) { console.warn("[Expenses] getCategories", error); return []; }
  return (data || []) as ExpenseCategory[];
}

export async function addExpenseCategory(nom: string, description?: string): Promise<ExpenseCategory | null> {
  const { data, error } = await supabase.from("expense_categories").insert({ nom, description: description || null }).select().maybeSingle();
  if (error) { console.warn("[Expenses] addCategory", error); return null; }
  return data as ExpenseCategory;
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  await supabase.from("expense_categories").delete().eq("id", id);
}

// ─── Expenses ───
export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from("expenses").select("*").order("date_depense", { ascending: false });
  if (error) { console.warn("[Expenses] getExpenses", error); return []; }
  return (data || []) as Expense[];
}

export async function addExpense(e: Omit<Expense, "id" | "created_at" | "updated_at">): Promise<Expense | null> {
  const { data, error } = await supabase.from("expenses").insert(e).select().maybeSingle();
  if (error) { console.warn("[Expenses] addExpense", error); return null; }
  return data as Expense;
}

export async function updateExpense(id: string, e: Partial<Expense>): Promise<void> {
  const { error } = await supabase.from("expenses").update(e).eq("id", id);
  if (error) console.warn("[Expenses] updateExpense", error);
}

export async function deleteExpense(id: string): Promise<void> {
  await supabase.from("expenses").delete().eq("id", id);
}

// ─── Justificatif upload (public bucket school-assets) ───
export async function uploadJustificatif(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `expenses/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("school-assets").upload(path, file, { upsert: false });
  if (error) { console.warn("[Expenses] upload", error); return null; }
  const { data } = supabase.storage.from("school-assets").getPublicUrl(path);
  return data.publicUrl;
}
