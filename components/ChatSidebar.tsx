"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NewConversationModal from "./NewConversationModal";

type Conversation = {
  id: string;
  isGroup: boolean;
  name: string;
  memberCount: number;
  otherUser: { id: string; hasAvatar: boolean } | null;
  online: boolean | number;
  unreadCount: number;
  lastMessage: { preview: string | null; createdAt: string; mine: boolean; senderName: string | null } | null;
};

type SearchResult = {
  id: string;
  body: string | null;
  createdAt: string;
  conversationId: string;
  conversationName: string;
  isThreadReply: boolean;
  parentMessageId: string | null;
  senderName: string;
};

export default function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      fetch(`/api/chat/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setResults(data);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  function load() {
    fetch("/api/chat/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setConversations(data);
      })
      .finally(() => setLoading(false));
  }

  function goToResult(r: SearchResult) {
    const target = r.isThreadReply ? `/chat/${r.conversationId}?thread=${r.parentMessageId}` : `/chat/${r.conversationId}?m=${r.id}`;
    setQuery("");
    router.push(target);
  }

  const showingSearch = query.trim().length >= 2;

  return (
    <div className="card flex h-[calc(100vh-140px)] w-full flex-col overflow-hidden sm:w-72">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">Conversaciones</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm text-white hover:bg-brand-700"
          title="Nueva conversación"
        >
          +
        </button>
      </div>

      <div className="border-b border-slate-100 p-2">
        <input
          className="input"
          placeholder="🔎 Buscar en el chat..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {showingSearch ? (
          searching ? (
            <p className="p-4 text-sm text-slate-400">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Sin resultados para "{query}".</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => goToResult(r)}
                className="block w-full border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">{r.conversationName}</p>
                  <p className="shrink-0 text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString("es-ES")}</p>
                </div>
                <p className="truncate text-xs text-slate-500">
                  <span className="font-medium">{r.senderName}: </span>
                  {r.body}
                  {r.isThreadReply && <span className="ml-1 text-slate-400">(en un hilo)</span>}
                </p>
              </button>
            ))
          )
        ) : loading ? (
          <p className="p-4 text-sm text-slate-400">Cargando...</p>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">Todavía no tienes conversaciones. Crea una con el botón +.</p>
        ) : (
          conversations.map((c) => {
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
                <div className="relative shrink-0">
                  {!c.isGroup && c.otherUser?.hasAvatar ? (
                    <img src={`/api/users/${c.otherUser.id}/avatar`} alt={c.name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                        c.isGroup ? "bg-slate-200 text-slate-600" : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {c.isGroup ? "👥" : initials}
                    </div>
                  )}
                  {!c.isGroup && c.online === true && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  )}
                </div>
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
                    {c.isGroup && typeof c.online === "number" && c.online > 0 ? `${c.online} en línea · ` : ""}
                    {c.lastMessage
                      ? `${c.lastMessage.mine ? "Tú: " : c.isGroup && c.lastMessage.senderName ? `${c.lastMessage.senderName}: ` : ""}${c.lastMessage.preview}`
                      : "Sin mensajes todavía"}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {showModal && <NewConversationModal onClose={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
