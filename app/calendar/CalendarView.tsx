"use client";

import { useEffect, useMemo, useState } from "react";
import { getHolidayMap } from "@/lib/colombianHolidays";

type UserOption = { id: string; name: string; email: string };

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  userId: string;
  groupId: string | null;
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
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
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

  // Festivos de Colombia: se calculan para el año del mes que se ve, más el
  // anterior y el siguiente (por si la grilla muestra días de diciembre o
  // enero de otro año).
  const holidayMap = useMemo(
    () => getHolidayMap([monthCursor.getFullYear() - 1, monthCursor.getFullYear(), monthCursor.getFullYear() + 1]),
    [monthCursor]
  );
  const selectedHoliday = holidayMap.get(dateKey(selectedDate));

  function openFormFor(date: Date) {
    setFormDate(date);
    setEditingEvent(null);
    setShowForm(true);
  }

  function openEditFor(event: EventRow) {
    setEditingEvent(event);
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
              <div key={w} className={w === "Dom" ? "text-red-400" : undefined}>
                {w}
              </div>
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
                const holidayName = holidayMap.get(key);
                const isSunday = d.getDay() === 0;
                const isSpecial = Boolean(holidayName) || isSunday;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(d)}
                    title={holidayName}
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
                        isToday
                          ? "bg-brand-600 font-semibold text-white"
                          : isSpecial && inMonth
                          ? "font-semibold text-red-500"
                          : inMonth
                          ? "text-slate-700"
                          : "text-slate-300"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex w-full flex-col gap-0.5">
                      {holidayName && (
                        <span className="truncate rounded bg-red-100 px-1 py-0.5 text-[10px] text-red-600" title={holidayName}>
                          {holidayName}
                        </span>
                      )}
                      {dayEvents.slice(0, holidayName ? 1 : 2).map((e) => (
                        <span
                          key={e.id}
                          onDoubleClick={(ev) => {
                            ev.stopPropagation();
                            openEditFor(e);
                          }}
                          className={`truncate rounded px-1 py-0.5 text-[10px] ${CHIP_STYLES[e.status]}`}
                          title={`${e.title} (doble clic para editar)`}
                        >
                          {e.title}
                        </span>
                      ))}
                      {dayEvents.length > (holidayName ? 1 : 2) && (
                        <span className="text-[10px] text-slate-400">
                          +{dayEvents.length - (holidayName ? 1 : 2)} más
                        </span>
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

          {selectedHoliday && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              🎉 Festivo: {selectedHoliday}
            </p>
          )}

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No hay citas este día.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => {
                const canRespond = viewingSelf && e.status === "PENDING";
                const canManage = viewingSelf || e.createdBy?.id === currentUserId;
                return (
                  <div
                    key={e.id}
                    onDoubleClick={() => canManage && openEditFor(e)}
                    title={canManage ? "Doble clic para editar" : undefined}
                    className={`rounded-lg border border-slate-100 p-3 ${canManage ? "cursor-pointer" : ""}`}
                  >
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
                        <>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              openEditFor(e);
                            }}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleDelete(e.id);
                            }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                        </>
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
        <EventFormModal
          users={users}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          defaultUserId={viewingUserId}
          initialDate={formDate || selectedDate}
          editingEvent={editingEvent}
          onClose={() => {
            setShowForm(false);
            setEditingEvent(null);
          }}
          onCreated={(newEvents) => {
            setEvents((prev) => [...prev, ...newEvents.filter((ev) => ev.userId === viewingUserId)]);
            setShowForm(false);
          }}
          onUpdated={() => {
            setShowForm(false);
            setEditingEvent(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EventFormModal({
  users,
  currentUserId,
  currentUserName,
  defaultUserId,
  initialDate,
  editingEvent,
  onClose,
  onCreated,
  onUpdated
}: {
  users: UserOption[];
  currentUserId: string;
  currentUserName: string;
  defaultUserId: string;
  initialDate: Date;
  editingEvent: EventRow | null;
  onClose: () => void;
  onCreated: (events: EventRow[]) => void;
  onUpdated: () => void;
}) {
  const isEditing = Boolean(editingEvent);
  const [title, setTitle] = useState(editingEvent?.title || "");
  const [description, setDescription] = useState(editingEvent?.description || "");
  const [startsAt, setStartsAt] = useState(() => {
    const d = editingEvent ? new Date(editingEvent.startsAt) : new Date(initialDate);
    if (!editingEvent) d.setHours(Math.max(d.getHours(), 9), 0, 0, 0);
    return toLocalInputValue(d);
  });
  const [endsAt, setEndsAt] = useState(() =>
    editingEvent?.endsAt ? toLocalInputValue(new Date(editingEvent.endsAt)) : ""
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([defaultUserId]);
  const [alreadyInvitedIds, setAlreadyInvitedIds] = useState<string[]>(editingEvent ? [editingEvent.userId] : []);
  const [addUserIds, setAddUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingEvent) return;
    if (!editingEvent.groupId) return;
    fetch(`/api/calendar/events?groupId=${editingEvent.groupId}`)
      .then((r) => r.json())
      .then((data: EventRow[]) => {
        if (Array.isArray(data)) setAlreadyInvitedIds(data.map((e) => e.userId));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleUser(id: string) {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  function toggleAddUser(id: string) {
    setAddUserIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isEditing && editingEvent) {
      const res = await fetch(`/api/calendar/events/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null
        })
      });
      if (!res.ok) {
        setLoading(false);
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo editar la cita");
        return;
      }

      if (addUserIds.length > 0) {
        const inviteRes = await fetch(`/api/calendar/events/${editingEvent.id}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: addUserIds })
        });
        setLoading(false);
        if (!inviteRes.ok) {
          const data = await inviteRes.json().catch(() => ({}));
          setError(data.error || "El título y la fecha se guardaron, pero no se pudo invitar a las personas nuevas");
          return;
        }
      } else {
        setLoading(false);
      }

      onUpdated();
      return;
    }

    if (selectedUserIds.length === 0) {
      setLoading(false);
      setError("Selecciona al menos un invitado");
      return;
    }

    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIds: selectedUserIds,
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

  const invitesSomeoneElse = !isEditing && selectedUserIds.some((id) => id !== currentUserId);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="card w-full max-w-md space-y-4 p-6"
      >
        <h2 className="text-lg font-semibold">{isEditing ? "Editar cita" : "Nueva cita"}</h2>
        {invitesSomeoneElse && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            A quienes no seas tú les va a quedar pendiente de aceptar; les llega un aviso a su bandeja de entrada.
          </p>
        )}
        {isEditing && editingEvent?.groupId && (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Esta cita se agendó para varias personas; el título, la descripción y la fecha se actualizan para todas.
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

        {!isEditing && (
          <div>
            <label className="mb-1 block text-sm font-medium">Invitados</label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
              <label className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(currentUserId)}
                  onChange={() => toggleUser(currentUserId)}
                />
                Yo ({currentUserName})
              </label>
              {users
                .filter((u) => u.id !== currentUserId)
                .map((u) => (
                  <label key={u.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} />
                    {u.name}
                  </label>
                ))}
            </div>
          </div>
        )}

        {isEditing && (
          <div>
            <label className="mb-1 block text-sm font-medium">Agregar invitados</label>
            {users.filter((u) => !alreadyInvitedIds.includes(u.id)).length === 0 ? (
              <p className="text-xs text-slate-400">Ya está invitado todo el equipo.</p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                {users
                  .filter((u) => !alreadyInvitedIds.includes(u.id))
                  .map((u) => (
                    <label key={u.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50">
                      <input type="checkbox" checked={addUserIds.includes(u.id)} onChange={() => toggleAddUser(u.id)} />
                      {u.name}
                    </label>
                  ))}
              </div>
            )}
            {addUserIds.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Les va a quedar pendiente de aceptar; les llega un aviso a su bandeja de entrada.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn">
            {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Agendar"}
          </button>
        </div>
      </form>
    </div>
  );
}
