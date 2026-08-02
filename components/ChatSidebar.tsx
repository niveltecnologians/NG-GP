"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Contact = {
  id: string;
  name: string;
  email: string;
  hasAvatar: boolean;
  unreadCount: number;
  lastMessage: { preview: string | null; createdAt: string; mine: boolean } | null;
};

export default function ChatSidebar() {
  const pathname = usePathname();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  function load() {
    fetch("/api/chat/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(data))
      .finally(() => setLoading(false));
  }

  return (
    <div className="card flex h-[calc(100vh-140px)] w-full flex-col overflow-hidden sm:w-72">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">Chat</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-4 text-sm text-slate-400">Cargando...</p>
        ) : contacts.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">No hay otros usuarios registrados todavía.</p>
        ) : (
          contacts.map((c) => {
            const active = pathname === `/chat/${c.id}`;
            const initials = c.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className={`flex items-center gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 ${
                  active ? "bg-brand-50" : ""
                }`}
              >
                {c.hasAvatar ? (
                  <img src={`/api/users/${c.id}/avatar`} alt={c.name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                    {c.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-400">
                    {c.lastMessage ? `${c.lastMessage.mine ? "Tú: " : ""}${c.lastMessage.preview}` : "Sin mensajes todavía"}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
