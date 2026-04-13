import { useState } from "react";
import { getAllUsers, createUser, updateUser, type AppUser, type UserRole, getRoleLabel } from "@/lib/auth";
import { Plus, X, Pencil } from "lucide-react";

export function UtilisateursModule() {
  const [users, setUsers] = useState<AppUser[]>(getAllUsers());
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", role: "gestionnaire" as UserRole });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) return;
    createUser(form);
    setUsers(getAllUsers());
    setShowForm(false);
    setForm({ username: "", password: "", displayName: "", role: "gestionnaire" });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    updateUser(editUser.id, { username: form.username, password: form.password, displayName: form.displayName });
    setUsers(getAllUsers());
    setEditUser(null);
  };

  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setForm({ username: u.username, password: u.password, displayName: u.displayName, role: u.role });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Gestion des Utilisateurs</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Créer un utilisateur
        </button>
      </div>

      {(showForm || editUser) && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editUser ? "Modifier l'utilisateur" : "Nouvel Utilisateur"}</h3>
              <button onClick={() => { setShowForm(false); setEditUser(null); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={editUser ? handleEdit : handleAdd} className="space-y-3">
              <input placeholder="Nom d'utilisateur" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <input placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <input placeholder="Nom complet" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              {!editUser && (
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                  <option value="dg">Directeur Général</option>
                  <option value="de">Directeur d&apos;Études</option>
                  <option value="gestionnaire">Gestionnaire</option>
                </select>
              )}
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">
                {editUser ? "Modifier" : "Créer"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Identifiant</th>
                <th className="text-left px-4 py-3 font-medium">Nom</th>
                <th className="text-left px-4 py-3 font-medium">Rôle</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">{u.displayName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary">{getRoleLabel(u.role)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-secondary">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
