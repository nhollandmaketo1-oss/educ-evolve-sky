/**
 * HR store: contracts, staff documents, performance evaluations.
 * Simple Supabase-direct calls (no offline queue for these modules yet).
 */
import { supabase } from "@/integrations/supabase/client";

export interface Contract {
  id: string;
  personnel_id: string;
  type: string;
  date_debut: string;
  date_fin: string | null;
  salaire: number;
  statut: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StaffDocument {
  id: string;
  personnel_id: string;
  nom: string;
  type: string;
  url: string;
  created_at?: string;
}

export interface PerformanceEvaluation {
  id: string;
  personnel_id: string;
  periode: string;
  objectifs: string | null;
  ponctualite: number;
  pedagogie: number;
  discipline: number;
  participation: number;
  note_globale: number;
  commentaire: string | null;
  created_at?: string;
}

// ─── Contracts ───
export async function getContracts(personnelId?: string): Promise<Contract[]> {
  let q = supabase.from("contracts").select("*").order("date_debut", { ascending: false });
  if (personnelId) q = q.eq("personnel_id", personnelId);
  const { data, error } = await q;
  if (error) { console.warn("[HR] getContracts", error); return []; }
  return (data || []) as Contract[];
}

export async function addContract(c: Omit<Contract, "id" | "created_at" | "updated_at">): Promise<Contract | null> {
  const { data, error } = await supabase.from("contracts").insert(c).select().maybeSingle();
  if (error) { console.warn("[HR] addContract", error); return null; }
  return data as Contract;
}

export async function updateContract(id: string, c: Partial<Contract>): Promise<void> {
  await supabase.from("contracts").update(c).eq("id", id);
}

export async function deleteContract(id: string): Promise<void> {
  await supabase.from("contracts").delete().eq("id", id);
}

// ─── Staff documents ───
export async function getStaffDocuments(personnelId?: string): Promise<StaffDocument[]> {
  let q = supabase.from("staff_documents").select("*").order("created_at", { ascending: false });
  if (personnelId) q = q.eq("personnel_id", personnelId);
  const { data, error } = await q;
  if (error) { console.warn("[HR] getStaffDocuments", error); return []; }
  return (data || []) as StaffDocument[];
}

export async function uploadStaffDocument(personnelId: string, file: File, type: string): Promise<StaffDocument | null> {
  const path = `${personnelId}/${Date.now()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("staff-documents").upload(path, file, { upsert: true });
  if (upErr) { console.warn("[HR] upload", upErr); return null; }
  const { data: { publicUrl } } = supabase.storage.from("staff-documents").getPublicUrl(path);
  const { data, error } = await supabase.from("staff_documents").insert({
    personnel_id: personnelId,
    nom: file.name,
    type,
    url: publicUrl,
  }).select().maybeSingle();
  if (error) { console.warn("[HR] insert doc", error); return null; }
  return data as StaffDocument;
}

export async function deleteStaffDocument(id: string): Promise<void> {
  await supabase.from("staff_documents").delete().eq("id", id);
}

// ─── Performance ───
export async function getEvaluations(personnelId?: string): Promise<PerformanceEvaluation[]> {
  let q = supabase.from("performance_evaluations").select("*").order("created_at", { ascending: false });
  if (personnelId) q = q.eq("personnel_id", personnelId);
  const { data, error } = await q;
  if (error) { console.warn("[HR] getEvaluations", error); return []; }
  return (data || []) as PerformanceEvaluation[];
}

export async function addEvaluation(e: Omit<PerformanceEvaluation, "id" | "created_at" | "note_globale"> & { note_globale?: number }): Promise<PerformanceEvaluation | null> {
  const note_globale = e.note_globale ?? Number(((e.ponctualite + e.pedagogie + e.discipline + e.participation) / 4).toFixed(2));
  const { data, error } = await supabase.from("performance_evaluations").insert({ ...e, note_globale }).select().maybeSingle();
  if (error) { console.warn("[HR] addEvaluation", error); return null; }
  return data as PerformanceEvaluation;
}

export async function updateEvaluation(id: string, e: Partial<PerformanceEvaluation>): Promise<void> {
  const updates: Partial<PerformanceEvaluation> = { ...e };
  if (
    e.ponctualite !== undefined || e.pedagogie !== undefined ||
    e.discipline !== undefined || e.participation !== undefined
  ) {
    const { data } = await supabase.from("performance_evaluations").select("*").eq("id", id).maybeSingle();
    if (data) {
      const merged = { ...(data as PerformanceEvaluation), ...e };
      updates.note_globale = Number(((merged.ponctualite + merged.pedagogie + merged.discipline + merged.participation) / 4).toFixed(2));
    }
  }
  await supabase.from("performance_evaluations").update(updates).eq("id", id);
}

export async function deleteEvaluation(id: string): Promise<void> {
  await supabase.from("performance_evaluations").delete().eq("id", id);
}
