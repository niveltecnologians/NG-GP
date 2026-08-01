"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TicketListItem = {
  id: string;
  subject: string;
  body: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  updatedAt: string;
  sender: { name: string; email: string } | null;
  recipient: { name: string; email: string } | null;
  _count: { replies: number };
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  CLOSED: "bg-slate-100 text-slate-600"
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierto",
  IN_PROGRESS: "En progreso",
  CLOSED: "Cerrado"
};

export default function InboxPage() {
  const [box, setBox] = useState<"received" | "sent">("received");
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/inbox?box=${box}`)
      .then((r) => r.json())
      .then((data) => setTickets(data))
      .finally(() => setLoading(false));
  }, [box]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bandeja de entrada</h1>
          <p className="text-sm text-slate-500">Requerimientos enviados y recibidos, con trazabilidad completa</p>
        </div>
        <Link href="/inbox/new" className="btn">+ Nuevo requerimiento</Link>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          className={box === "received" ? "btn" : "btn-secondary"}
          onClick={() => setBox("received")}
        >
          Recibidos
        </button>
        <button
          className={box === "sent" ? "btn" : "btn-secondary"}
          onClick={() => setBox("sent")}
        >
          Enviados
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : tickets.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No hay requerimientos en esta bandeja.</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {tickets.map((t) => (
            <Link key={t.id} href={`/inbox/${t.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-slate-900">{t.subject}</p>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>
                <p className="truncate text-sm text-slate-500">
                  {box === "received" ? `De: ${t.sender?.name || "Usuario eliminado"}` : `Para: ${t.recipient?.name || "Usuario eliminado"}`} — {t.body}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-slate-400">
                <div>{new Date(t.updatedAt).toLocaleString("es-ES")}</div>
                <div>{t._count.replies} respuesta(s)</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
