import { useState, useEffect } from "react";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { authenticate, loginUser } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import loginBg from "@/assets/login-bg.jpg.asset.json";

function playWelcomeSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 3);
    master.connect(ctx.destination);

    // Petite symphonie: arpège majestueux Do-Mi-Sol-Do (3s)
    const notes: Array<{ f: number; t: number; d: number }> = [
      { f: 523.25, t: 0.00, d: 0.7 },  // C5
      { f: 659.25, t: 0.35, d: 0.7 },  // E5
      { f: 783.99, t: 0.70, d: 0.9 },  // G5
      { f: 1046.5, t: 1.05, d: 1.8 },  // C6 (tenu)
      { f: 392.00, t: 1.05, d: 1.8 },  // G4 (basse)
      { f: 261.63, t: 1.05, d: 1.8 },  // C4 (fondamentale)
    ];

    notes.forEach(({ f, t, d }) => {
      ["triangle", "sine"].forEach((type, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type as OscillatorType;
        osc.frequency.value = f * (i === 1 ? 2 : 1);
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(i === 1 ? 0.15 : 0.4, now + t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
        osc.connect(g);
        g.connect(master);
        osc.start(now + t);
        osc.stop(now + t + d + 0.05);
      });
    });

    setTimeout(() => ctx.close(), 3300);
  } catch { /* silent fallback */ }
}

export function LoginPage() {
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (!showWelcome) return;
    // Wait a tick so voices have loaded, then speak
    const t1 = setTimeout(() => playWelcomeSound(), 250);
    const t2 = setTimeout(() => setShowWelcome(false), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showWelcome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const user = await authenticate(username, password);
    if (user) {
      loginUser(user);
      refresh();
    } else {
      setError("Identifiant ou mot de passe incorrect");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-primary px-4 overflow-hidden">
      {/* Background image at 40% opacity */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${loginBg.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.4,
        }}
      />
      <div aria-hidden className="absolute inset-0 bg-primary/40 pointer-events-none" />

      {/* Welcome splash */}
      {showWelcome && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-primary/85 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-5 animate-pulse">
            <GraduationCap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white font-[family-name:var(--font-display)] tracking-wide">
            BIENVENUE
          </h1>
          <p className="text-white/90 text-base mt-2">sur EDUC 2.0</p>
          <p className="text-white/70 text-xs mt-4 italic">Système Intelligent de Gestion Scolaire</p>
          <button
            onClick={() => setShowWelcome(false)}
            className="mt-8 px-5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm transition-colors"
          >
            Continuer
          </button>
        </div>
      )}

      {/* Login card */}
      <div className="relative z-10 bg-card rounded-2xl shadow-2xl p-8 w-full max-w-md">
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
            <input type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} placeholder="Entrez votre identifiant" className="w-full px-4 py-3 rounded-xl bg-input text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Mot de passe</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="Entrez votre mot de passe" className="w-full px-4 py-3 rounded-xl bg-input text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition-all pr-12" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "Connexion..." : "Se Connecter"}
          </button>
        </form>
      </div>

      <p className="relative z-10 mt-6 text-primary-foreground/80 text-sm font-medium">MAKETO NHOLLAND</p>

      {/* 3D credits bottom-right */}
      <div className="absolute bottom-2 right-3 z-10 flex flex-col items-end text-right select-none">
        <span
          className="text-xs font-extrabold tracking-wider"
          style={{
            color: "#87CEEB",
            WebkitTextStroke: "0.5px #FFD700",
            textShadow:
              "0 1px 0 #1a3a6e, 0 2px 0 #14305c, 0 3px 0 #0f2549, 0 3px 4px rgba(0,0,0,0.55), 0 0 2px #ffffff",
            fontFamily: "var(--font-display)",
          }}
        >
          PROPULSÉ PAR
        </span>
        <span
          className="text-[10px] font-extrabold italic tracking-wide"
          style={{
            color: "#bfe3ff",
            WebkitTextStroke: "0.5px #ffffff",
            textShadow:
              "0 1px 0 #15366a, 0 2px 0 #102a55, 0 3px 0 #0a1f40, 0 3px 5px rgba(0,0,0,0.6), 0 0 2px #FFD700",
            fontFamily: "var(--font-display)",
          }}
        >
          Oliver Fix Service — DU 2 JUIN 2026
        </span>
      </div>

      {/* Version bottom-left */}
      <span
        className="absolute bottom-2 left-3 z-10 text-[10px] font-bold tracking-widest"
        style={{
          background: "linear-gradient(90deg, #C0C0C0 0%, #FFD700 50%, #C0C0C0 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textShadow: "0 1px 1px rgba(0,0,0,0.4)",
        }}
      >
        V 04.03.90
      </span>
    </div>
  );
}
