export type UserRole = "dg" | "de" | "gestionnaire";

export interface AppUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  photo?: string;
}

const DEFAULT_USERS: AppUser[] = [
  { id: "1", username: "DG001", password: "1234", role: "dg", displayName: "Directeur Général" },
  { id: "2", username: "DE002", password: "0304", role: "de", displayName: "Directeur d'Études" },
  { id: "3", username: "GES003", password: "1306", role: "gestionnaire", displayName: "Gestionnaire" },
];

function getUsers(): AppUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  const stored = localStorage.getItem("educ_users");
  if (stored) return JSON.parse(stored);
  localStorage.setItem("educ_users", JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

function saveUsers(users: AppUser[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("educ_users", JSON.stringify(users));
}

export function authenticate(username: string, password: string): AppUser | null {
  const users = getUsers();
  return users.find((u) => u.username === username && u.password === password) || null;
}

export function getCurrentUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("educ_current_user");
  if (!stored) return null;
  const userId = JSON.parse(stored);
  const users = getUsers();
  return users.find((u) => u.id === userId) || null;
}
  return users.find((u) => u.id === userId) || null;
}

export function loginUser(user: AppUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem("educ_current_user", JSON.stringify(user.id));
}

export function logoutUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("educ_current_user");
}

export function updateUser(userId: string, updates: Partial<Pick<AppUser, "username" | "password" | "displayName" | "photo">>): AppUser {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("User not found");
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

export function getAllUsers(): AppUser[] {
  return getUsers();
}

export function createUser(user: Omit<AppUser, "id">): AppUser {
  const users = getUsers();
  const newUser: AppUser = { ...user, id: String(Date.now()) };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "dg": return "Directeur Général";
    case "de": return "Directeur d'Études";
    case "gestionnaire": return "Gestionnaire";
  }
}
