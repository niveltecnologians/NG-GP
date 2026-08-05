"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";
import InstallAppButton from "@/components/InstallAppButton";

export default function Navbar({
  user,
  appName,
  hasLogo
}: {
  user: SessionPayload;
  appName: string;
  hasLogo: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [avatarError, setAvatarError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const prevInbox = useRef<number | null>(null);
  const prevChat = useRef<number | null>(null);

  // Cierra el menú de celular solo al cambiar de página.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
  }, []);

  useEffect(() => {
    function poll() {
      fetch("/api/inbox/unread-count")
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.count !== "number") return;
          if (prevInbox.current !== null && data.count > prevInbox.current) {
            notify("Bandeja de entrada", "Tienes un requerimiento nuevo o sin responder.");
          }
          prevInbox.current = data.count;
          setInboxUnread(data.count);
        })
        .catch(() => {});

      fetch("/api/chat/unread-count")
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.count !== "number") return;
          if (prevChat.current !== null && data.count > prevChat.current) {
            notify("Chat", "Tienes un mensaje nuevo.");
          }
          prevChat.current = data.count;
          setChatUnread(data.count);
        })
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function notify(title: string, body: string) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (typeof document !== "undefined" && document.visibilityState === "visible" && document.hasFocus()) return;
    try {
      new Notification(title, { body, icon: "/icons/icon-192.png" });
    } catch {
      // algunos navegadores móviles no soportan `new Notification(...)`; se ignora en silencio.
    }
  }

  function handleEnableNotifications() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((perm) => setNotifPermission(perm));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Fuerza a traer la versión más nueva del sitio. Sirve sobre todo cuando
  // la app está instalada en el celular: al no tener barra de navegador, no
  // hay botón de recargar, así que este lo reemplaza (y de paso avisa al
  // service worker que revise si hay una versión nueva).
  function handleRefresh() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.update()));
    }
    window.location.reload();
  }

  const links = [
    { href: "/dashboard", label: "Proyectos", badge: 0 },
    { href: "/inbox", label: "Bandeja de entrada", badge: inboxUnread },
    { href: "/chat", label: "Chat", badge: chatUnread },
    { href: "/reports", label: "Informes", badge: 0 },
    ...(user.role === "ADMIN"
      ? [
          { href: "/users", label: "Usuarios", badge: 0 },
          { href: "/settings", label: "Configuración", badge: 0 }
        ]
      : [])
  ];

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const appInitials = appName.slice(0, 2).toUpperCase();

  const totalBadge = inboxUnread + chatUnread;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-7">
          <div className="flex items-center gap-1.5">
            <Link href="/dashboard" className="flex items-center gap-2">
              {hasLogo && !logoError ? (
                <img
                  src="/api/settings/logo-image"
                  alt={appName}
                  onError={() => setLogoError(true)}
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                  {appInitials}
                </span>
              )}
              <span className="text-base font-bold text-slate-900">{appName}</span>
            </Link>
            <button
              onClick={handleRefresh}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-brand-600"
              title="Actualizar la app a la versión más reciente"
              aria-label="Actualizar"
            >
              🔄
            </button>
          </div>
          {/* Menú horizontal: solo en pantallas medianas o más grandes. */}
          <nav className="hidden gap-1 text-sm font-medium text-slate-600 sm:flex">
            {links.map((l) => {
              const active = pathname === l.href || pathname?.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative rounded-md px-3 py-1.5 transition ${
                    active ? "bg-brand-50 text-brand-700" : "hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                  {l.badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                      {l.badge > 9 ? "9+" : l.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Lado derecho: en escritorio se ve todo; en celular solo el botón de menú. */}
        <div className="hidden items-center gap-3 sm:flex">
          <InstallAppButton />
          {notifPermission === "default" && (
            <button
              onClick={handleEnableNotifications}
              className="text-xs text-slate-400 hover:text-brand-600"
              title="Recibir un aviso del navegador cuando llegue algo nuevo"
            >
              🔔 Activar avisos
            </button>
          )}
          <Link href="/profile" className="flex items-center gap-2">
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

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 sm:hidden"
          aria-label="Abrir menú"
        >
          {menuOpen ? "✕" : "☰"}
          {!menuOpen && totalBadge > 0 && (
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-brand-600" />
          )}
        </button>
      </div>

      {/* Menú desplegable de celular: enlaces uno debajo del otro, botones grandes. */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white sm:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3 text-sm font-medium text-slate-600">
            {links.map((l) => {
              const active = pathname === l.href || pathname?.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center justify-between rounded-md px-3 py-2.5 transition ${
                    active ? "bg-brand-50 text-brand-700" : "hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                  {l.badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                      {l.badge > 9 ? "9+" : l.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-2 border-t border-slate-100 px-4 py-3">
            <Link href="/profile" className="flex items-center gap-2 rounded-md px-1 py-1.5">
              {!avatarError ? (
                <img
                  src={`/api/users/${user.userId}/avatar`}
                  alt={user.name}
                  onError={() => setAvatarError(true)}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {initials}
                </span>
              )}
              <div className="text-sm leading-tight">
                <div className="font-medium text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-400">{user.role === "ADMIN" ? "Administrador" : "Miembro"}</div>
              </div>
            </Link>
            <InstallAppButton expanded />
            {notifPermission === "default" && (
              <button
                onClick={handleEnableNotifications}
                className="flex w-full items-center gap-2 rounded-md px-1 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                🔔 Activar avisos
              </button>
            )}
            <button onClick={handleLogout} className="btn-secondary w-full py-2">
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
