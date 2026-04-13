// Simple localStorage-based data store for EDUC 2.0

export interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  contactParent: string;
  dateInscription: string;
  status: "actif" | "inactif";
}

export interface Personnel {
  id: string;
  nom: string;
  prenom: string;
  type: "enseignant" | "surveillant";
  matiere?: string;
  salaire: number;
  telephone: string;
}

export interface Payment {
  id: string;
  studentId: string;
  montant: number;
  date: string;
  mois: string;
  status: "payé" | "impayé" | "partiel";
}

export interface Attendance {
  id: string;
  personnelId: string;
  date: string;
  heure: string;
  present: boolean;
}

export interface Notification {
  id: string;
  message: string;
  date: string;
  read: boolean;
  targetRole: "dg" | "de" | "gestionnaire" | "all";
}

const CLASSES = [
  "CP1", "CP2", "CE1", "CE2", "CM1", "CM2",
  "6ème", "5ème", "4ème", "3ème",
  "2nde", "1ère", "Terminale"
];

const MATIERES = [
  "Français", "Mathématiques", "Anglais", "Physique-Chimie",
  "SVT", "Histoire-Géographie", "Philosophie", "EPS",
  "Informatique", "Éducation Civique", "Dessin", "Musique"
];

export { CLASSES, MATIERES };

function get<T>(key: string, fallback: T[] = []): T[] {
  const d = localStorage.getItem(`educ_${key}`);
  return d ? JSON.parse(d) : fallback;
}

function set<T>(key: string, data: T[]) {
  localStorage.setItem(`educ_${key}`, JSON.stringify(data));
}

// Students
export function getStudents(): Student[] { return get<Student>("students"); }
export function addStudent(s: Omit<Student, "id">): Student {
  const students = getStudents();
  const newS: Student = { ...s, id: String(Date.now()) };
  students.push(newS);
  set("students", students);
  // Add notification
  addNotification({
    message: `Nouvel élève inscrit: ${s.prenom} ${s.nom} en ${s.classe}`,
    date: new Date().toISOString(),
    read: false,
    targetRole: "dg",
  });
  return newS;
}

// Personnel
export function getPersonnel(): Personnel[] { return get<Personnel>("personnel"); }
export function addPersonnel(p: Omit<Personnel, "id">): Personnel {
  const list = getPersonnel();
  const newP: Personnel = { ...p, id: String(Date.now()) };
  list.push(newP);
  set("personnel", list);
  return newP;
}

// Payments
export function getPayments(): Payment[] { return get<Payment>("payments"); }
export function addPayment(p: Omit<Payment, "id">): Payment {
  const list = getPayments();
  const newP: Payment = { ...p, id: String(Date.now()) };
  list.push(newP);
  set("payments", list);
  return newP;
}

// Attendance
export function getAttendance(): Attendance[] { return get<Attendance>("attendance"); }
export function addAttendance(a: Omit<Attendance, "id">): Attendance {
  const list = getAttendance();
  const newA: Attendance = { ...a, id: String(Date.now()) };
  list.push(newA);
  set("attendance", list);
  return newA;
}
export function setAttendanceBulk(records: Omit<Attendance, "id">[]) {
  const list = getAttendance();
  const newRecords = records.map(r => ({ ...r, id: String(Date.now() + Math.random()) }));
  set("attendance", [...list, ...newRecords]);
}

// Notifications
export function getNotifications(): Notification[] { return get<Notification>("notifications"); }
export function addNotification(n: Omit<Notification, "id">) {
  const list = getNotifications();
  list.unshift({ ...n, id: String(Date.now()) });
  set("notifications", list);
}
export function markNotificationRead(id: string) {
  const list = getNotifications();
  const idx = list.findIndex(n => n.id === id);
  if (idx !== -1) { list[idx].read = true; set("notifications", list); }
}
