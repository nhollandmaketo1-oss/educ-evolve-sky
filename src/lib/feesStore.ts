/**
 * Frais de scolarité + factures.
 * Supabase-direct. Aussi utilitaires pour la génération des rappels de paiement.
 */
import { supabase } from "@/integrations/supabase/client";
import { getStudents, addNotification, getPayments, type Student } from "@/lib/store";

export interface ClassFee {
  id: string;
  classe: string;
  frais_inscription: number;
  frais_mensuel: number;
  mois_count: number;
  devise: string;
}

export interface Invoice {
  id: string;
  numero: string;
  student_id: string;
  classe: string;
  mois: string | null;
  type_frais: string; // 'mensuel' | 'inscription' | 'autre'
  montant: number;
  date_emission: string;
  date_echeance: string | null;
  statut: string; // 'emise' | 'payee' | 'annulee'
  notes: string | null;
}

export const SCHOOL_MONTHS = [
  { key: "10", label: "Octobre" }, { key: "11", label: "Novembre" }, { key: "12", label: "Décembre" },
  { key: "01", label: "Janvier" }, { key: "02", label: "Février" }, { key: "03", label: "Mars" },
  { key: "04", label: "Avril" }, { key: "05", label: "Mai" }, { key: "06", label: "Juin" },
];

// ─── Class fees ───
export async function getClassFees(): Promise<ClassFee[]> {
  const { data, error } = await supabase.from("class_fees").select("*").order("classe");
  if (error) { console.warn("[Fees] getClassFees", error); return []; }
  return (data || []) as ClassFee[];
}

export async function upsertClassFee(fee: Omit<ClassFee, "id">): Promise<ClassFee | null> {
  const { data, error } = await supabase.from("class_fees")
    .upsert({ ...fee }, { onConflict: "classe" }).select().maybeSingle();
  if (error) { console.warn("[Fees] upsert", error); return null; }
  return data as ClassFee;
}

export async function deleteClassFee(id: string): Promise<void> {
  await supabase.from("class_fees").delete().eq("id", id);
}

// ─── Invoices ───
export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase.from("invoices").select("*").order("date_emission", { ascending: false });
  if (error) { console.warn("[Fees] getInvoices", error); return []; }
  return (data || []) as Invoice[];
}

export async function addInvoice(i: Omit<Invoice, "id" | "numero"> & { numero?: string }): Promise<Invoice | null> {
  const numero = i.numero || `FAC-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase.from("invoices").insert({ ...i, numero }).select().maybeSingle();
  if (error) { console.warn("[Fees] addInvoice", error); return null; }
  return data as Invoice;
}

export async function updateInvoice(id: string, i: Partial<Invoice>): Promise<void> {
  const { error } = await supabase.from("invoices").update(i).eq("id", id);
  if (error) console.warn("[Fees] updateInvoice", error);
}

export async function deleteInvoice(id: string): Promise<void> {
  await supabase.from("invoices").delete().eq("id", id);
}

/**
 * Génère les factures mensuelles pour tous les élèves actifs d'une classe (ou de toutes)
 * pour un mois donné (YYYY-MM). Idempotent : ignore les factures existantes (student+mois+type).
 */
export async function generateMonthlyInvoices(yearMonth: string, classeFilter?: string): Promise<number> {
  const [fees, students, existing] = await Promise.all([getClassFees(), getStudents(), getInvoices()]);
  const feeMap = new Map(fees.map((f) => [f.classe, f]));
  const targets = students.filter((s) => s.status === "actif" && (!classeFilter || s.classe === classeFilter));
  const exists = new Set(existing.filter((i) => i.type_frais === "mensuel" && i.mois === yearMonth).map((i) => i.student_id));
  let created = 0;
  for (const s of targets) {
    if (exists.has(s.id)) continue;
    const f = feeMap.get(s.classe);
    if (!f) continue;
    const [y, m] = yearMonth.split("-");
    const echeance = `${y}-${m}-02`; // le 2 du mois
    const res = await addInvoice({
      student_id: s.id, classe: s.classe, mois: yearMonth,
      type_frais: "mensuel", montant: Number(f.frais_mensuel) || 0,
      date_emission: new Date().toISOString().slice(0, 10),
      date_echeance: echeance, statut: "emise", notes: null,
    });
    if (res) created++;
  }
  return created;
}

/**
 * Génère les rappels de paiement pour parents (>3 jours après le 2 du mois de la période scolaire).
 * Idempotent grâce au message unique (mois + student).
 */
export async function generatePaymentReminders(): Promise<number> {
  const [students, payments, invoices] = await Promise.all([getStudents(), getPayments(), getInvoices()]);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();

  // Période scolaire: octobre à juin
  const inSchoolPeriod = month >= 10 || month <= 6;
  if (!inSchoolPeriod) return 0;
  // Rappel seulement si on est passé du 5 du mois (2 + 3 jours)
  if (day < 5) return 0;

  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  let created = 0;

  for (const s of students as Student[]) {
    if (s.status !== "actif") continue;
    if (!s.parent_user_id) continue;
    // Facture du mois
    const inv = invoices.find((i) => i.student_id === s.id && i.mois === yearMonth && i.type_frais === "mensuel");
    if (inv && inv.statut === "payee") continue;
    // Paiement enregistré ?
    const paid = payments.some((p) => p.student_id === s.id && p.mois === yearMonth && p.status === "payé");
    if (paid) continue;

    const key = `RAPPEL-${yearMonth}-${s.id}`;
    // Anti-doublon via notifications récentes (message contient la clé)
    const { data: dup } = await supabase.from("notifications").select("id").ilike("message", `%${key}%`).limit(1);
    if (dup && dup.length) continue;

    await addNotification({
      message: `[${key}] Rappel : le paiement de la scolarité de ${s.prenom} ${s.nom} (${s.classe}) pour ${yearMonth} est en retard. Merci de régulariser.`,
      target_role: `parent:${s.parent_user_id}`,
      read: false,
    });
    // Aussi notifier la comptabilité
    await addNotification({
      message: `Retard de paiement — ${s.prenom} ${s.nom} (${s.classe}) — ${yearMonth}`,
      target_role: "comptable",
      read: false,
    });
    created++;
  }
  return created;
}
