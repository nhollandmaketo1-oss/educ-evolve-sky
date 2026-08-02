import { db, wipeLocalData } from "./offlineDb";
import { queueChange } from "./syncEngine";
import { sdb, purgeBucket } from "@/lib/secureDb";
import { ensureParentUser } from "@/lib/auth";

export interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  contact_parent: string | null;
  date_inscription: string;
  status: "actif" | "inactif";
  montant_inscription: number;
  frais_scolaire: number;
  parent_user_id?: string | null;
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
  niveau?: string | null;
  email?: string | null;
  adresse?: string | null;
  date_embauche?: string | null;
  diplomes?: string | null;
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
  heures_effectuees: number;
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

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ─── Students ───
export async function getStudents(): Promise<Student[]> {
  const rows = await db.students.reverse().sortBy("date_inscription");
  return rows as unknown as Student[];
}

export async function addStudent(s: Omit<Student, "id">): Promise<Student | null> {
  const id = uuid();
  // Auto-créer le compte parent à partir du numéro de téléphone
  const parentUserId = await ensureParentUser(s.contact_parent, `${s.prenom} ${s.nom}`);
  const record = {
    id,
    nom: s.nom,
    prenom: s.prenom,
    classe: s.classe,
    contact_parent: s.contact_parent,
    date_inscription: now(),
    status: s.status,
    montant_inscription: s.montant_inscription,
    frais_scolaire: s.frais_scolaire,
    parent_user_id: parentUserId,
    _synced: false,
    _updated_at: now(),
  };
  await db.students.add(record);
  await queueChange("students", "insert", id, record);
  await addNotification({ message: `Nouvel élève inscrit: ${s.prenom} ${s.nom} en ${s.classe}`, target_role: "dg", read: false });
  if (parentUserId) {
    await addNotification({
      message: `Bienvenue ! Votre compte parent est actif. Identifiant : votre numéro de téléphone. Mot de passe par défaut : 2026.`,
      target_role: `parent:${parentUserId}`,
      read: false,
    });
  }
  return { ...record } as unknown as Student;
}

export async function updateStudent(id: string, s: Partial<Omit<Student, "id">>): Promise<void> {
  const existing = await db.students.get(id);
  if (!existing) return;
  const updated = { ...existing, ...s, _synced: false, _updated_at: now() };
  await db.students.put(updated);
  await queueChange("students", "update", id, updated);
}

export async function deleteStudent(id: string): Promise<void> {
  await db.students.delete(id);
  await queueChange("students", "delete", id, null);
}

// ─── Personnel ───
export async function getPersonnel(): Promise<Personnel[]> {
  return (await db.personnel.toArray()) as unknown as Personnel[];
}

export async function addPersonnel(p: Omit<Personnel, "id">): Promise<Personnel | null> {
  const id = uuid();
  const record = {
    id,
    nom: p.nom,
    prenom: p.prenom,
    type: p.type,
    matiere: p.matiere,
    salaire: p.salaire,
    telephone: p.telephone,
    photo: p.photo,
    niveau: p.niveau ?? null,
    email: p.email ?? null,
    adresse: p.adresse ?? null,
    date_embauche: p.date_embauche ?? null,
    diplomes: p.diplomes ?? null,
    _synced: false,
    _updated_at: now(),
  };
  await db.personnel.add(record);
  await queueChange("personnel", "insert", id, record);
  return { ...record } as unknown as Personnel;
}

export async function updatePersonnel(id: string, p: Partial<Omit<Personnel, "id">>): Promise<void> {
  const existing = await db.personnel.get(id);
  if (!existing) return;
  const updated = { ...existing, ...p, _synced: false, _updated_at: now() };
  await db.personnel.put(updated);
  await queueChange("personnel", "update", id, updated);
}

export async function deletePersonnel(id: string): Promise<void> {
  await db.personnel.delete(id);
  await queueChange("personnel", "delete", id, null);
}

// ─── Payments ───
export async function getPayments(): Promise<Payment[]> {
  return (await db.payments.reverse().sortBy("date")) as unknown as Payment[];
}

export async function addPayment(p: Omit<Payment, "id">): Promise<Payment | null> {
  const id = uuid();
  const record = {
    id,
    student_id: p.student_id,
    montant: p.montant,
    date: now(),
    mois: p.mois,
    status: p.status,
    _synced: false,
    _updated_at: now(),
  };
  await db.payments.add(record);
  await queueChange("payments", "insert", id, record);
  return { ...record } as unknown as Payment;
}

export async function updatePayment(id: string, p: Partial<Omit<Payment, "id">>): Promise<void> {
  const existing = await db.payments.get(id);
  if (!existing) return;
  const updated = { ...existing, ...p, _synced: false, _updated_at: now() };
  await db.payments.put(updated);
  await queueChange("payments", "update", id, updated);
}

export async function deletePayment(id: string): Promise<void> {
  await db.payments.delete(id);
  await queueChange("payments", "delete", id, null);
}

// ─── Attendance ───
export async function getAttendance(): Promise<Attendance[]> {
  return (await db.attendance.reverse().sortBy("date")) as unknown as Attendance[];
}

export async function addAttendanceBulk(records: Omit<Attendance, "id">[]) {
  for (const r of records) {
    const id = uuid();
    const record = {
      id,
      personnel_id: r.personnel_id,
      date: r.date,
      heure: r.heure,
      present: r.present,
      heures_effectuees: Number(r.heures_effectuees) || 0,
      _synced: false,
      _updated_at: now(),
    };
    await db.attendance.add(record);
    await queueChange("attendance", "insert", id, record);
  }
}

/** Total hours worked by a personnel for a given month (YYYY-MM). */
export async function getTotalHoursForMonth(personnelId: string, yearMonth: string): Promise<number> {
  const all = await db.attendance.where("personnel_id").equals(personnelId).toArray();
  return all
    .filter((a) => a.present && a.date.startsWith(yearMonth))
    .reduce((sum, a) => sum + (Number(a.heures_effectuees) || 0), 0);
}

// ─── Notifications ───
export async function getNotifications(): Promise<Notification[]> {
  return (await db.notifications.reverse().sortBy("created_at")).slice(0, 20) as unknown as Notification[];
}

export async function addNotification(n: Omit<Notification, "id" | "created_at">) {
  const id = uuid();
  const record = {
    id,
    message: n.message,
    target_role: n.target_role,
    read: n.read,
    created_at: now(),
    _synced: false,
    _updated_at: now(),
  };
  await db.notifications.add(record);
  await queueChange("notifications", "insert", id, record);
}

export async function markNotificationRead(id: string) {
  const existing = await db.notifications.get(id);
  if (!existing) return;
  const updated = { ...existing, read: true, _synced: false, _updated_at: now() };
  await db.notifications.put(updated);
  await queueChange("notifications", "update", id, updated);
}

export async function deleteNotification(id: string) {
  await db.notifications.delete(id);
  await queueChange("notifications", "delete", id, null);
}

export async function deleteAllNotifications(role?: string) {
  const all = await db.notifications.toArray();
  for (const n of all) {
    if (role && n.target_role !== role && n.target_role !== "all") continue;
    await db.notifications.delete(n.id);
    await queueChange("notifications", "delete", n.id, null);
  }
}

// ─── App Settings ───
export async function getSetting(key: string): Promise<string | null> {
  const row = await db.app_settings.get(key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const record = { key, value, _synced: false, _updated_at: now() };
  await db.app_settings.put(record);
  await queueChange("app_settings", "update", key, record);
}

export async function deleteSetting(key: string): Promise<void> {
  await db.app_settings.delete(key);
  await queueChange("app_settings", "delete", key, null);
}

// ─── Grades ───
export async function getGrades(): Promise<Grade[]> {
  return (await db.grades.toArray()) as unknown as Grade[];
}

export async function addGrade(g: Omit<Grade, "id">): Promise<Grade | null> {
  const id = uuid();
  const record = {
    id,
    student_id: g.student_id,
    matiere: g.matiere,
    note: g.note,
    coefficient: g.coefficient,
    trimestre: g.trimestre,
    annee_scolaire: g.annee_scolaire,
    commentaire: g.commentaire,
    _synced: false,
    _updated_at: now(),
  };
  await db.grades.add(record);
  await queueChange("grades", "insert", id, record);
  return { ...record } as unknown as Grade;
}

// ─── Bulk grades for a single student (used by NotesModule) ───
export async function addGradesBulk(items: Omit<Grade, "id">[]): Promise<void> {
  for (const g of items) {
    if (g.note === null || g.note === undefined || Number.isNaN(Number(g.note))) continue;
    await addGrade(g);
  }
}

// ─── Coefficients by class level (Congo system) ───
export const COEFFICIENTS_CONGO: Record<string, Record<string, number>> = {
  primaire: {
    "Français": 5, "Mathématiques": 5, "Anglais": 1, "SVT": 1,
    "Histoire-Géographie": 2, "EPS": 1, "Éducation Civique": 1,
    "Dessin": 1, "Musique": 1, "Informatique": 1,
  },
  college: {
    "Français": 4, "Mathématiques": 4, "Anglais": 2, "Physique-Chimie": 2,
    "SVT": 2, "Histoire-Géographie": 2, "EPS": 1, "Éducation Civique": 1,
    "Informatique": 1, "Dessin": 1, "Musique": 1,
  },
  lycee: {
    "Français": 3, "Mathématiques": 5, "Anglais": 2, "Physique-Chimie": 4,
    "SVT": 3, "Histoire-Géographie": 2, "Philosophie": 3, "EPS": 1,
    "Informatique": 1, "Éducation Civique": 1,
  },
};

export function getClassLevel(classe: string): "primaire" | "college" | "lycee" {
  if (["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"].includes(classe)) return "primaire";
  if (["6ème", "5ème", "4ème", "3ème"].includes(classe)) return "college";
  return "lycee";
}

export function getMatieresForClass(classe: string): { matiere: string; coefficient: number }[] {
  const map = COEFFICIENTS_CONGO[getClassLevel(classe)] || {};
  return Object.entries(map).map(([matiere, coefficient]) => ({ matiere, coefficient }));
}

// ─── Danger: full data reset (preserves only the 3 protected auth users) ───
const PROTECTED_USERNAMES = ["DG001", "DE002", "GES003"];

export async function resetAllData(): Promise<void> {
  const tables = ["students", "personnel", "payments", "attendance", "grades", "notifications", "messages"];
  for (const t of tables) {
    try {
      await sdb.from(t)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {
      console.warn(`[Reset] failed clearing ${t}`, e);
    }
  }
  try {
    await sdb.from("app_users").delete().not("username", "in", `(${PROTECTED_USERNAMES.map((u) => `"${u}"`).join(",")})`);
  } catch (e) {
    console.warn("[Reset] failed clearing non-protected users", e);
  }
  try {
    await sdb.from("app_settings").delete().neq("key", "school_name").neq("key", "school_logo");
  } catch { /* */ }
  try {
    await purgeBucket("message-attachments");
  } catch { /* */ }
  await wipeLocalData();
}
