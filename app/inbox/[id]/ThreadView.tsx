"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Author = { id: string; name: string; email: string };
type Reply = { id: string; body: string; createdAt: string; author: Author | null };
type Ticket = {
  id: string;
  subject: string;
  body: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  createdAt: string;
  sender: Author | null;
  recipient: Author | null;
  replies: Reply[];
};

const DELETED_LABEL = "Usuario eliminado";

const STATUS_LABEL: Record<string, string> = { OPEN: "Abierto", IN_PROGRESS: "En progreso", CLOSED: "Cerrado" };

export default function ThreadView({ ticket, currentUserId }: { ticket: Ticket; currentUserId: string }) {
  const router = useRouter();
  const [replies, setReplies] = useState(ticket.replies);
  const [status, setStatus] = useState(ticket.status);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/inbox/${ticket.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body })
    });
    setLoading(false);
    if (res.ok) {
      const reply = await res.json();
      setReplies((prev) => [...prev, reply]);
      setBody("");
      router.refresh();
    }
  }

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus as typeof status);
    await fetch(`/api/inbox/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <p className="text-sm text-slate-500">
            De {ticket.sender?.name || DELETED_LABEL} ({ticket.sender?.email || "—"}) para {ticket.recipient?.name || DELETED_LABEL} ({ticket.recipient?.email || "—"})
          </p>
          <p className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleString("es-ES")}</p>
        </div>
        <select className="input w-40" value={status} onChange={(e) => handleStatusChange(e.target.value)}>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500">{ticket.sender?.name || DELETED_LABEL}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{ticket.body}</p>
        </div>

        {replies.map((r) => (
          <div key={r.id} className={`card p-4 ${r.author?.id === currentUserId ? "border-brand-200 bg-brand-50" : ""}`}>
            <p className="text-xs font-medium text-slate-500">{r.author?.name || DELETED_LABEL}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{r.body}</p>
            <p className="mt-1 text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleString("es-ES")}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleReply} className="card mt-4 space-y-3 p-4">
        <textarea
          className="input"
          rows={3}
          placeholder="Escribe una respuesta..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn">
            {loading ? "Enviando..." : "Responder"}
          </button>
        </div>
      </form>
    </div>
  );
}
