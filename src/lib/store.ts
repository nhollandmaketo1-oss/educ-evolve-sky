import { supabase } from "@/integrations/supabase/client";

export interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  contact_parent: string | null;
  date_inscription: string;
  status: "actif" | "inactif";
  montant_inscription: number;
}

export interface Personnel {
  id: string;
  nom: string;
  prenom: string;
  type: "enseignant" | "surveillant";
  matiere: string | null;
  salaire: number;
  telephone: string | null;
  photo: string | null;
}

export interface Payment {
  id: string;
  student_id: string;
  montant: number;
  date: string;
  mois: string;
  status: "payé" | "impayé" | "partiel";
}

export interface Attendance {
  id: string;
  personnel_id: string;
  date: string;
  heure: string;
  present: boolean;
}

export interface Notification {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
  target_role: string;
}

export interface Grade {
  id: string;
  student_id: string;
  matiere: string;
  note: number;
  coefficient: number;
  trimestre: number;
  annee_scolaire: string;
  commentaire: string | null;
}

export const CLASSES = [
  "CP1", "CP2", "CE1", "CE2", "CM1", "CM2",
  "6ème", "5ème", "4ème", "3ème",
  "2nde", "1ère", "Terminale"
];

export const MATIERES = [
  "Français", "Mathématiques", "Anglais", "Physique-Chimie",
  "SVT", "Histoire-Géographie", "Philosophie", "EPS",
  "Informatique", "Éducation Civique", "Dessin", "Musique"
];

// Students
export async function getStudents(): Promise<Student[]> {
  const { data } = await supabase.from("students").select("*").order("created_at", { ascending: false });
  return (data || []) as Student[];
}

export async function addStudent(s: Omit<Student, "id">): Promise<Student | null> {
  const { data, error } = await supabase.from("students").insert({
    nom: s.nom, prenom: s.prenom, classe: s.classe,
    contact_parent: s.contact_parent, status: s.status,
    montant_inscription: s.montant_inscription,
  }).select().maybeSingle();
  if (error || !data) return null;
  await addNotification({ message: `Nouvel élève inscrit: ${s.prenom} ${s.nom} en ${s.classe}`, target_role: "dg", read: false });
  return data as Student;
}

export async function updateStudent(id: string, s: Partial<Omit<Student, "id">>): Promise<void> {
  await supabase.from("students").update(s).eq("id", id);
}

export async function deleteStudent(id: string): Promise<void> {
  await supabase.from("students").delete().eq("id", id);
}

export async function getPersonnel(): Promise<Personnel[]> {
  const { data } = await supabase.from("personnel").select("*").order("created_at", { ascending: false });
  return (data || []) as Personnel[];
}

export async function addPersonnel(p: Omit<Personnel, "id">): Promise<Personnel | null> {
  const { data } = await supabase.from("personnel").insert({
    nom: p.nom, prenom: p.prenom, type: p.type,
    matiere: p.matiere, salaire: p.salaire, telephone: p.telephone,
    photo: p.photo,
  }).select().maybeSingle();
  return (data || null) as Personnel | null;
}

export async function updatePersonnel(id: string, p: Partial<Omit<Personnel, "id">>): Promise<void> {
  await supabase.from("personnel").update(p).eq("id", id);
}

export async function deletePersonnel(id: string): Promise<void> {
  await supabase.from("personnel").delete().eq("id", id);
}

// Payments
export async function getPayments(): Promise<Payment[]> {
  const { data } = await supabase.from("payments").select("*").order("date", { ascending: false });
  return (data || []) as Payment[];
}

export async function addPayment(p: Omit<Payment, "id">): Promise<Payment | null> {
  const { data } = await supabase.from("payments").insert({
    student_id: p.student_id, montant: p.montant, mois: p.mois, status: p.status,
  }).select().maybeSingle();
  return (data || null) as Payment | null;
}

// Attendance
export async function getAttendance(): Promise<Attendance[]> {
  const { data } = await supabase.from("attendance").select("*").order("date", { ascending: false });
  return (data || []) as Attendance[];
}

export async function addAttendanceBulk(records: Omit<Attendance, "id">[]) {
  await supabase.from("attendance").insert(records.map((r) => ({
    personnel_id: r.personnel_id, date: r.date, heure: r.heure, present: r.present,
  })));
}

// Notifications
export async function getNotifications(): Promise<Notification[]> {
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
  return (data || []) as Notification[];
}

export async function addNotification(n: Omit<Notification, "id" | "created_at">) {
  await supabase.from("notifications").insert({ message: n.message, target_role: n.target_role, read: n.read });
}

export async function markNotificationRead(id: string) {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

// Grades
export async function getGrades(): Promise<Grade[]> {
  const { data } = await supabase.from("grades").select("*").order("created_at", { ascending: false });
  return (data || []) as Grade[];
}

export async function addGrade(g: Omit<Grade, "id">): Promise<Grade | null> {
  const { data } = await supabase.from("grades").insert({
    student_id: g.student_id, matiere: g.matiere, note: g.note,
    coefficient: g.coefficient, trimestre: g.trimestre,
    annee_scolaire: g.annee_scolaire, commentaire: g.commentaire,
  }).select().maybeSingle();
  return (data || null) as Grade | null;
}
