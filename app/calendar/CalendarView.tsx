"use client";

import { useEffect, useState } from "react";

type UserOption = { id: string; name: string; email: string };

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  userId: string;
  createdBy: { id: string; name: string } | null;
};

const STATUS_LABELS: Record<string, string> = { PENDING: "Pendiente", ACCEPTED: "Aceptada", DECLINED: "Rechazada" };
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  DECLINED: "bg-red-100 text-red-700"
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

export default function CalendarView({
  currentUserId,
  currentUserName,
  isAdmin
}: {
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
}) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [viewingUserId, setViewingUserId] = useState(currentUserId);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users/list")
        .then((r) => r.json())
        .then((data) => setUsers(data))
        .catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingUserId]);

  function load() {
    setLoading(true);
    fetch(`/api/calendar/events?userId=${viewingUserId}`)
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  async function handleRespond(id: string, status: "ACCEPTED" | "DECLINED") {
    const res = await fetch(`/api/calendar/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      const updated = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta cita? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const viewingSelf = viewingUserId === currentUserId;
  const viewingName = viewingSelf ? "Tú" : users.find((u) => u.id === viewingUserId)?.name || "";

  const now = new Date();
  const sorted = [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <div>
      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
        {isAdmin ? (
          <div>
            <label className="mb-1 block text-sm font-medium">Ver calendario de</label>
            <select className="input w-64" value={viewingUserId} onChange={(e) => setViewingUserId(e.target.value)}>
              <option value={currentUserId}>Yo ({currentUserName})</option>
              {users
                .filter((u) => u.id !== currentUserId)
                .map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Tu agenda</p>
        )}
        <button className="btn" onClick={() => setShowForm(true)}>
          + Nueva cita
        </button>
      </div>

      {!viewingSelf && (
        <p className="mb-4 text-xs text-slate-400">
          Estás viendo la disponibilidad de <strong>{viewingName}</strong>. Si agendas una cita, le va a llegar como
          pendiente de aceptar en su bandeja de entrada y en su calendario.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : sorted.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No hay citas todavía.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((e) => {
            const start = new Date(e.startsAt);
            const isPast = start < now;
            const canRespond = viewingSelf && e.status === "PENDING";
            const canManage = viewingSelf || e.createdBy?.id === currentUserId || isAdmin;
            return (
              <div key={e.id} className={`card p-4 ${isPast ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{e.title}</p>
                      <span className={`badge ${STATUS_STYLES[e.status]}`}>{STATUS_LABELS[e.status]}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {start.toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" })}
                      {e.endsAt && ` – ${new Date(e.endsAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                    {e.description && <p className="mt-1 text-sm text-slate-600">{e.description}</p>}
                    {e.createdBy && e.createdBy.id !== e.userId && (
                      <p className="mt-1 text-xs text-slate-400">Agendada por {e.createdBy.name}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {canRespond && (
                      <>
                        <button onClick={() => handleRespond(e.id, "ACCEPTED")} className="btn py-1.5 text-xs">
                          Aceptar
                        </button>
                        <button
                          onClick={() => handleRespond(e.id, "DECLINED")}
                          className="btn-secondary py-1.5 text-xs text-red-600"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {canManage && (
                      <button onClick={() => handleDelete(e.id)} className="text-xs text-red-600 hover:underline">
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <NewEventForm
          targetUserId={viewingUserId}
          targetUserName={viewingName}
          isSelf={viewingSelf}
          onClose={() => setShowForm(false)}
          onCreated={(event) => {
            setEvents((prev) => [...prev, event]);
            setShowForm(false);
          }}
        />
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function NewEventForm({
  targetUserId,
  targetUserName,
  isSelf,
  onClose,
  onCreated
}: {
  targetUserId: string;
  targetUserName: string;
  isSelf: boolean;
  onClose: () => void;
  onCreated: (event: EventRow) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: targetUserId,
        title,
        description,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null
      })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear la cita");
      return;
    }
    const created = await res.json();
    onCreated(created);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="card w-full max-w-md space-y-4 p-6"
      >
        <h2 className="text-lg font-semibold">
          {isSelf ? "Nueva cita" : `Agendar cita para ${targetUserName}`}
        </h2>
        {!isSelf && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Le va a quedar pendiente de aceptar; le llega un aviso a su bandeja de entrada.
          </p>
        )}
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium">Título</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Descripción (opcional)</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Comienza</label>
            <input
              type="datetime-local"
              className="input"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Termina (opcional)</label>
            <input type="datetime-local" className="input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn">
            {loading ? "Guardando..." : "Agendar"}
          </button>
        </div>
      </form>
    </div>
  );
}
