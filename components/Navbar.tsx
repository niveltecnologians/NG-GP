"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";

export default function Navbar({ user }: { user: SessionPayload }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-brand-700">
            Gestor de Proyectos
          </Link>
          <nav className="flex gap-4 text-sm font-medium text-slate-600">
            <Link href="/dashboard" className="hover:text-brand-600">Proyectos</Link>
            <Link href="/inbox" className="hover:text-brand-600">Bandeja de entrada</Link>
            <Link href="/reports" className="hover:text-brand-600">Informes</Link>
            {user.role === "ADMIN" && (
              <Link href="/users" className="hover:text-brand-600">Usuarios</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{user.name} · {user.role === "ADMIN" ? "Admin" : "Miembro"}</span>
          <button onClick={handleLogout} className="btn-secondary py-1.5">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
