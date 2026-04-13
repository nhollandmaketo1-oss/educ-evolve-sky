import { useState } from "react";
import { getCurrentUser, updateUser, type AppUser } from "@/lib/auth";
import { Camera } from "lucide-react";

interface ProfilModuleProps {
  onUpdate: () => void;
}

export function ProfilModule({ onUpdate }: ProfilModuleProps) {
  const user = getCurrentUser();
  const [form, setForm] = useState({
    username: user?.username || "",
    password: user?.password || "",
    displayName: user?.displayName || "",
  });
  const [photo, setPhoto] = useState(user?.photo || "");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    updateUser(user.id, { ...form, photo });
    setSaved(true);
    onUpdate();
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Mon Profil</h2>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {photo ? (
                <img src={photo} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">{user.displayName.charAt(0)}</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:opacity-90">
              <Camera className="w-4 h-4 text-primary-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nom d&apos;utilisateur</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nom complet</label>
            <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-input text-foreground border border-border" />
          </div>

          {saved && <p className="text-success text-sm text-center">Modifications enregistrées !</p>}

          <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">
            Enregistrer les modifications
          </button>
        </form>
      </div>
    </div>
  );
}
