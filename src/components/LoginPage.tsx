import { useState } from "react";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { authenticate, loginUser } from "@/lib/auth";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = authenticate(username, password);
    if (user) {
      loginUser(user);
      onLogin();
    } else {
      setError("Identifiant ou mot de passe incorrect");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary px-4">
      <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <GraduationCap className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground font-[family-name:var(--font-display)]">EDUC 2.0</h1>
          <p className="text-muted-foreground text-sm mt-1">Système de Gestion Scolaire</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nom d&apos;utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder="Entrez votre identifiant"
              className="w-full px-4 py-3 rounded-xl bg-input text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Entrez votre mot de passe"
                className="w-full px-4 py-3 rounded-xl bg-input text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Se Connecter
          </button>
        </form>
      </div>

      <p className="mt-6 text-primary-foreground/80 text-sm font-medium">MAKETO NHOLLAND</p>
    </div>
  );
}
