import { useState, useEffect } from "react";
import { getAllUsers, createUser, updateUser, type AppUser, type UserRole, getRoleLabel } from "@/lib/auth";
import { Plus, X, Pencil, Camera } from "lucide-react";

export function UtilisateursModule() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ username: "", password: "", display_name: "", role: "gestionnaire" as UserRole, poste: "", telephone: "" });
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => { getAllUsers().then(setUsers); }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) return;
    await createUser({ ...form, photo, poste: form.poste || undefined, telephone: form.telephone || undefined });
    setUsers(await getAllUsers());
    setShowForm(false);
    setForm({ username: "", password: "", display_name: "", role: "gestionnaire", poste: "", telephone: "" });
    setPhoto(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    await updateUser(editUser.id, { username: form.username, password: form.password, display_name: form.display_name, photo: photo ?? undefined, poste: form.poste || undefined, telephone: form.telephone || undefined });
    setUsers(await getAllUsers());
    setEditUser(null);
    setPhoto(null);
  };

  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setForm({ username: u.username, password: u.password, display_name: u.display_name, role: u.role, poste: u.poste || "", telephone: u.telephone || "" });
    setPhoto(u.photo || null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Gestion des Utilisateurs</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> Créer un utilisateur</button>
      </div>
      {(showForm || editUser) && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editUser ? "Modifier l'utilisateur" : "Nouvel Utilisateur"}</h3>
              <button onClick={() => { setShowForm(false); setEditUser(null); setPhoto(null); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={editUser ? handleEdit : handleAdd} className="space-y-3">
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">
                    {photo ? <img src={photo} alt="Photo" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              <input placeholder="Nom d'utilisateur" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <input placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <input placeholder="Nom complet" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <input placeholder="Poste / Fonction" value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <input placeholder="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              {!editUser && (
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                  <option value="dg">Directeur Général</option><option value="de">Directeur d&apos;Études</option><option value="gestionnaire">Gestionnaire</option>
                </select>
              )}
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">{editUser ? "Modifier" : "Créer"}</button>
            </form>
          </div>
        </div>
      )}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-secondary text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Photo</th>
              <th className="text-left px-4 py-3 font-medium">Identifiant</th>
              <th className="text-left px-4 py-3 font-medium">Nom</th>
              <th className="text-left px-4 py-3 font-medium">Poste</th>
              <th className="text-left px-4 py-3 font-medium">Téléphone</th>
              <th className="text-left px-4 py-3 font-medium">Rôle</th>
              <th className="text-center px-4 py-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover" /> : (u.display_name?.charAt(0) || "U")}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">{u.display_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.poste || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.telephone || "—"}</td>
                  <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary">{getRoleLabel(u.role)}</span></td>
                  <td className="px-4 py-3 text-center"><button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
