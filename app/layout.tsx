import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import Navbar from "@/components/Navbar";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";

// Permite "Agregar a pantalla de inicio" en iOS y Android: la app se abre en
// pantalla completa, sin la barra del navegador, como una app instalada.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5"
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  const icon = settings.hasLogo ? "/api/settings/logo-image" : "/icons/icon-192.png";
  const appleIcon = settings.hasLogo ? "/api/settings/logo-image" : "/icons/apple-touch-icon.png";
  return {
    title: settings.appName,
    description: "Seguimiento de proyectos, tareas y requerimientos del equipo",
    manifest: "/manifest.webmanifest",
    icons: {
      icon,
      apple: appleIcon
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: settings.appName
    }
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const settings = await getAppSettings();

  let bodyStyle: React.CSSProperties = {};
  let bodyClassName = "min-h-screen bg-gradient-to-b from-brand-50/60 via-slate-50 to-slate-50";

  if (user) {
    const prefs = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { backgroundColor: true, hasBackgroundImage: true }
    });
    if (prefs?.hasBackgroundImage) {
      bodyClassName = "min-h-screen bg-slate-50 bg-cover bg-center bg-fixed";
      bodyStyle = { backgroundImage: "url(/api/profile/background-image)" };
    } else if (prefs?.backgroundColor) {
      bodyClassName = "min-h-screen";
      bodyStyle = { backgroundColor: prefs.backgroundColor };
    }
  }

  return (
    <html lang="es">
      <body className={bodyClassName} style={bodyStyle}>
        {user && <PresenceHeartbeat />}
        {user && <Navbar user={user} appName={settings.appName} hasLogo={settings.hasLogo} />}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
