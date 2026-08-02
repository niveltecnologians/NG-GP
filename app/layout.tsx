import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";

export const metadata: Metadata = {
  title: "Gestor de Proyectos",
  description: "Seguimiento de proyectos, tareas y requerimientos del equipo"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

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
        {user && <Navbar user={user} />}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
