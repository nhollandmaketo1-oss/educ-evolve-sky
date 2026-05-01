import Dexie, { type Table } from "dexie";

export interface LocalStudent {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  contact_parent: string | null;
  date_inscription: string;
  status: string;
  montant_inscription: number;
  frais_scolaire: number;
  _synced?: boolean;
  _updated_at?: string;
}

export interface LocalPersonnel {
  id: string;
  nom: string;
  prenom: string;
  type: string;
  matiere: string | null;
  salaire: number;
  telephone: string | null;
  photo: string | null;
  _synced?: boolean;
  _updated_at?: string;
}

export interface LocalPayment {
  id: string;
  student_id: string;
  montant: number;
  date: string;
  mois: string;
  status: string;
  _synced?: boolean;
  _updated_at?: string;
}

export interface LocalAttendance {
  id: string;
  personnel_id: string;
  date: string;
  heure: string;
  present: boolean;
  _synced?: boolean;
  _updated_at?: string;
}

export interface LocalNotification {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
  target_role: string;
  _synced?: boolean;
  _updated_at?: string;
}

export interface LocalGrade {
  id: string;
  student_id: string;
  matiere: string;
  note: number;
  coefficient: number;
  trimestre: number;
  annee_scolaire: string;
  commentaire: string | null;
  _synced?: boolean;
  _updated_at?: string;
}

export interface LocalAppSetting {
  key: string;
  value: string | null;
  _synced?: boolean;
  _updated_at?: string;
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: "insert" | "update" | "delete";
  record_id: string;
  data: Record<string, unknown> | null;
  created_at: string;
}

class EducDB extends Dexie {
  students!: Table<LocalStudent, string>;
  personnel!: Table<LocalPersonnel, string>;
  payments!: Table<LocalPayment, string>;
  attendance!: Table<LocalAttendance, string>;
  notifications!: Table<LocalNotification, string>;
  grades!: Table<LocalGrade, string>;
  app_settings!: Table<LocalAppSetting, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super("educ2_offline");
    this.version(1).stores({
      students: "id, classe, status",
      personnel: "id, type",
      payments: "id, student_id, mois, status",
      attendance: "id, personnel_id, date",
      notifications: "id, target_role, read",
      grades: "id, student_id, trimestre",
      app_settings: "key",
      sync_queue: "++id, table, operation",
    });
  }
}

export const db = new EducDB();
