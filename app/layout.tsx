import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Gestor de Proyectos",
  description: "Seguimiento de proyectos, tareas y requerimientos del equipo"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="es">
      <body>
        {user && <Navbar user={user} />}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
