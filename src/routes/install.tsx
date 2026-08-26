import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Smartphone, CheckCircle2, Share } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export const Route = createFileRoute("/install")({
  component: InstallPage,
  head: () => ({
    meta: [
      { title: "Installer Educ 2.0 — Application de gestion scolaire" },
      {
        name: "description",
        content:
          "Installez Educ 2.0 sur votre mobile ou ordinateur en un clic et utilisez la gestion scolaire même hors ligne.",
      },
      { property: "og:title", content: "Installer Educ 2.0" },
      {
        property: "og:description",
        content:
          "Installez l'application Educ 2.0 sur votre appareil pour un accès rapide et hors ligne.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function InstallPage() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl border p-6 space-y-5 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Installer Educ 2.0</h1>
        <p className="text-sm text-muted-foreground">
          Ajoutez l'application à votre écran d'accueil pour un accès rapide, même sans connexion
          internet.
        </p>

        {isInstalled ? (
          <p className="flex items-center justify-center gap-2 text-primary font-medium">
            <CheckCircle2 className="w-5 h-5" /> Application déjà installée
          </p>
        ) : canInstall ? (
          <button
            onClick={() => promptInstall()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Download className="w-5 h-5" /> Installer l'application
          </button>
        ) : isIOS ? (
          <div className="text-sm text-muted-foreground bg-muted rounded-xl p-4 text-left space-y-1">
            <p className="font-medium text-foreground flex items-center gap-2">
              <Share className="w-4 h-4" /> Sur iPhone / iPad
            </p>
            <p>1. Ouvrez ce lien dans Safari.</p>
            <p>2. Touchez le bouton Partager.</p>
            <p>3. Choisissez « Sur l'écran d'accueil ».</p>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground bg-muted rounded-xl p-4 text-left space-y-1">
            <p className="font-medium text-foreground">Installation manuelle</p>
            <p>
              Ouvrez le menu de votre navigateur puis choisissez « Installer l'application » ou
              « Ajouter à l'écran d'accueil ».
            </p>
          </div>
        )}

        <Link to="/" className="inline-block text-sm text-primary font-medium hover:underline">
          Continuer vers la connexion
        </Link>
      </div>
    </main>
  );
}
