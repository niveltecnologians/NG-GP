"use client";

import { useEffect, useMemo, useState } from "react";

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
const CHIP_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-brand-100 text-brand-700",
  DECLINED: "bg-red-100 text-red-500 line-through"
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

// Genera los 42 días (6 semanas) que se ven en la grilla del mes, empezando
// en lunes, incluyendo los días de relleno del mes anterior/siguiente.
function getMonthGrid(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = lunes
  const start = new Date(year, month, 1 - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function CalendarView({
  currentUserId,
  currentUserName
}: {
  currentUserId: string;
  currentUserName: string;
}) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [viewingUserId, setViewingUserId] = useState(currentUserId);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState<Date | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  useEffect(() => {
    fetch("/api/users/list")
      .then((r) => r.json())
      .then((data) => setUsers(data))
      .catch(() => {});
  }, []);

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

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    events.forEach((e) => {
      const key = dateKey(new Date(e.startsAt));
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
    return map;
  }, [events]);

  const pending = events.filter((e) => e.status === "PENDING");
  const days = getMonthGrid(monthCursor);
  const today = new Date();
  const monthLabel = monthCursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const selectedEvents = eventsByDay.get(dateKey(selectedDate)) || [];

  function openFormFor(date: Date) {
    setFormDate(date);
    setShowForm(true);
  }

  return (
    <div>
      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
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
        <button className="btn" onClick={() => openFormFor(selectedDate)}>
          + Nueva cita
        </button>
      </div>

      {!viewingSelf && (
        <p className="mb-4 text-xs text-slate-400">
          Estás viendo la disponibilidad de <strong>{viewingName}</strong>. Si agendas una cita, le va a llegar como
          pendiente de aceptar en su bandeja de entrada y en su calendario.
        </p>
      )}

      {viewingSelf && pending.length > 0 && (
        <div className="mb-5 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Pendientes de responder</h3>
          {pending.map((e) => (
            <div key={e.id} className="card flex flex-wrap items-center justify-between gap-2 border-amber-200 bg-amber-50/60 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{e.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(e.startsAt).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" })}
                  {e.createdBy && ` · Agendada por ${e.createdBy.name}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => handleRespond(e.id, "ACCEPTED")} className="btn py-1.5 text-xs">
                  Aceptar
                </button>
                <button onClick={() => handleRespond(e.id, "DECLINED")} className="btn-secondary py-1.5 text-xs text-red-600">
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <button
              className="btn-secondary py-1.5 text-xs"
              onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold capitalize text-slate-800">{monthLabel}</h2>
              <button
                className="text-xs text-brand-600 hover:underline"
                onClick={() => {
                  setMonthCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                  setSelectedDate(new Date());
                }}
              >
                Hoy
              </button>
            </div>
            <button
              className="btn-secondary py-1.5 text-xs"
              onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-1 pb-1 text-center text-[11px] font-medium text-slate-400">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          {loading ? (
            <p className="p-6 text-center text-sm text-slate-400">Cargando...</p>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const key = dateKey(d);
                const dayEvents = eventsByDay.get(key) || [];
                const inMonth = d.getMonth() === monthCursor.getMonth();
                const isToday = dateKey(d) === dateKey(today);
                const isSelected = dateKey(d) === dateKey(selectedDate);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(d)}
                    className={`flex min-h-[72px] flex-col items-start gap-0.5 rounded-lg border p-1.5 text-left transition sm:min-h-[92px] ${
                      isSelected
                        ? "border-brand-400 bg-brand-50"
                        : inMonth
                        ? "border-slate-100 hover:border-brand-200 hover:bg-slate-50"
                        : "border-transparent bg-slate-50/40"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                        isToday ? "bg-brand-600 font-semibold text-white" : inMonth ? "text-slate-700" : "text-slate-300"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex w-full flex-col gap-0.5">
                      {dayEvents.slice(0, 2).map((e) => (
                        <span
                          key={e.id}
                          className={`truncate rounded px-1 py-0.5 text-[10px] ${CHIP_STYLES[e.status]}`}
                          title={e.title}
                        >
                          {e.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] text-slate-400">+{dayEvents.length - 2} más</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <button className="text-xs text-brand-600 hover:underline" onClick={() => openFormFor(selectedDate)}>
              + Agendar
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No hay citas este día.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => {
                const canRespond = viewingSelf && e.status === "PENDING";
                const canManage = viewingSelf || e.createdBy?.id === currentUserId;
                return (
                  <div key={e.id} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{e.title}</p>
                      <span className={`badge ${STATUS_STYLES[e.status]}`}>{STATUS_LABELS[e.status]}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(e.startsAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      {e.endsAt && ` – ${new Date(e.endsAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                    {e.description && <p className="mt-1 text-xs text-slate-600">{e.description}</p>}
                    {e.createdBy && e.createdBy.id !== e.userId && (
                      <p className="mt-1 text-[11px] text-slate-400">Agendada por {e.createdBy.name}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      {canRespond && (
                        <>
                          <button onClick={() => handleRespond(e.id, "ACCEPTED")} className="btn py-1 text-xs">
                            Aceptar
                          </button>
                          <button
                            onClick={() => handleRespond(e.id, "DECLINED")}
                            className="btn-secondary py-1 text-xs text-red-600"
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <NewEventForm
          targetUserId={viewingUserId}
          targetUserName={viewingName}
          isSelf={viewingSelf}
          initialDate={formDate || selectedDate}
          onClose={() => setShowForm(false)}
          onCreated={(event) => {
            setEvents((prev) => [...prev, event]);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function NewEventForm({
  targetUserId,
  targetUserName,
  isSelf,
  initialDate,
  onClose,
  onCreated
}: {
  targetUserId: string;
  targetUserName: string;
  isSelf: boolean;
  initialDate: Date;
  onClose: () => void;
  onCreated: (event: EventRow) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date(initialDate);
    d.setHours(Math.max(d.getHours(), 9), 0, 0, 0);
    return toLocalInputValue(d);
  });
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
        <h2 className="text-lg font-semibold">{isSelf ? "Nueva cita" : `Agendar cita para ${targetUserName}`}</h2>
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
