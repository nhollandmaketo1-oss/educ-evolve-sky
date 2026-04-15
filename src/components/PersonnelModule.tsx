import { useState, useEffect } from "react";
import { getPersonnel, addPersonnel, updatePersonnel, deletePersonnel, MATIERES, type Personnel } from "@/lib/store";
import { Plus, X, Camera, Pencil, Trash2 } from "lucide-react";

export function PersonnelModule() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Personnel | null>(null);
  const [form, setForm] = useState({ nom: "", prenom: "", type: "enseignant" as Personnel["type"], matiere: MATIERES[0], salaire: "", telephone: "" });
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => { getPersonnel().then(setPersonnel); }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm({ nom: "", prenom: "", type: "enseignant", matiere: MATIERES[0], salaire: "", telephone: "" });
    setPhoto(null);
    setShowForm(false);
    setEditItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.prenom) return;
    const payload = { ...form, salaire: Number(form.salaire), matiere: form.type === "enseignant" ? form.matiere : null, telephone: form.telephone || null, photo };
    if (editItem) {
      await updatePersonnel(editItem.id, payload);
    } else {
      await addPersonnel(payload);
    }
    setPersonnel(await getPersonnel());
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce personnel ?")) return;
    await deletePersonnel(id);
    setPersonnel(await getPersonnel());
  };

  const openEdit = (p: Personnel) => {
    setEditItem(p);
    setForm({ nom: p.nom, prenom: p.prenom, type: p.type, matiere: p.matiere || MATIERES[0], salaire: String(p.salaire), telephone: p.telephone || "" });
    setPhoto(p.photo || null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Gestion du Personnel</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> Ajouter</button>
      </div>
      {(showForm || editItem) && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{editItem ? "Modifier le Personnel" : "Nouveau Personnel"}</h3><button onClick={resetForm}><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">
                    {photo ? <img src={photo} alt="Photo" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              <input placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <input placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" required />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Personnel["type"] })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                <option value="enseignant">Enseignant</option><option value="surveillant">Surveillant</option>
              </select>
              {form.type === "enseignant" && (
                <select value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border">
                  {MATIERES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
              <input type="number" placeholder="Salaire (FCFA)" value={form.salaire} onChange={(e) => setForm({ ...form, salaire: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <input placeholder="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">{editItem ? "Modifier" : "Ajouter"}</button>
            </form>
          </div>
        </div>
      )}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-secondary text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Photo</th>
              <th className="text-left px-4 py-3 font-medium">Nom</th><th className="text-left px-4 py-3 font-medium">Prénom</th>
              <th className="text-left px-4 py-3 font-medium">Type</th><th className="text-left px-4 py-3 font-medium">Matière</th>
              <th className="text-left px-4 py-3 font-medium">Salaire</th><th className="text-left px-4 py-3 font-medium">Téléphone</th>
              <th className="text-center px-4 py-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {personnel.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Aucun personnel</td></tr>
              ) : personnel.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : `${p.prenom[0]}${p.nom[0]}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.nom}</td><td className="px-4 py-3">{p.prenom}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.type === "enseignant" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>{p.type}</span></td>
                  <td className="px-4 py-3">{p.matiere || "—"}</td>
                  <td className="px-4 py-3">{Number(p.salaire).toLocaleString()} FCFA</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.telephone || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
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
