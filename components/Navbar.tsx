"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";

export default function Navbar({ user }: { user: SessionPayload }) {
  const router = useRouter();
  const pathname = usePathname();
  const [avatarError, setAvatarError] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: "Proyectos" },
    { href: "/inbox", label: "Bandeja de entrada" },
    { href: "/chat", label: "Chat" },
    { href: "/reports", label: "Informes" },
    ...(user.role === "ADMIN" ? [{ href: "/users", label: "Usuarios" }] : [])
  ];

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-7">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              GP
            </span>
            <span className="hidden text-base font-bold text-slate-900 sm:inline">Gestor de Proyectos</span>
          </Link>
          <nav className="flex gap-1 text-sm font-medium text-slate-600">
            {links.map((l) => {
              const active = pathname === l.href || pathname?.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 transition ${
                    active ? "bg-brand-50 text-brand-700" : "hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="hidden items-center gap-2 sm:flex">
            {!avatarError ? (
              <img
                src={`/api/users/${user.userId}/avatar`}
                alt={user.name}
                onError={() => setAvatarError(true)}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {initials}
              </span>
            )}
            <div className="text-sm leading-tight">
              <div className="font-medium text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-400">{user.role === "ADMIN" ? "Administrador" : "Miembro"}</div>
            </div>
          </Link>
          <button onClick={handleLogout} className="btn-secondary py-1.5">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
