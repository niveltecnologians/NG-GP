"use client";

import { useState } from "react";
import type { TaskStatus, TaskPriority, AreaLite } from "@/lib/types";
import { PRIORITY_LABELS, PRIORITY_COLORS, AREA_COLOR_BADGE } from "@/lib/types";

export type MyTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  area: AreaLite | null;
  projectId: string;
  projectName: string;
  // Última y primera columna del tablero de la obra a la que pertenece
  // esta tarea (depende del modo de esa obra: Tareas o Administrativo).
  doneStatus: TaskStatus;
  firstStatus: TaskStatus;
};

function formatDue(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota"
  });
}

export default function TasksView({ initialTasks }: { initialTasks: MyTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const pending = tasks.filter((t) => t.status !== t.doneStatus);
  const done = tasks.filter((t) => t.status === t.doneStatus);

  // Marca o desmarca una actividad. Como es la misma tarea del tablero de
  // esa obra (no una copia aparte), esto cambia su estado de verdad: la
  // manda a la última columna del tablero (o la regresa a la primera si se
  // desmarca). Se actualiza de una vez en pantalla; si el guardado falla,
  // se regresa como estaba.
  async function toggle(task: MyTask) {
    const isDone = task.status === task.doneStatus;
    const nextStatus = isDone ? task.firstStatus : task.doneStatus;

    setSavingId(task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });

    if (!res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
    }
    setSavingId(null);
  }

  function TaskRow({ task }: { task: MyTask }) {
    const isDone = task.status === task.doneStatus;
    return (
      <li className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
        <button
          onClick={() => toggle(task)}
          disabled={savingId === task.id}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs transition ${
            isDone ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 hover:border-brand-500"
          }`}
          aria-label={isDone ? "Marcar como pendiente" : "Marcar como terminada"}
        >
          {isDone && "✓"}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${isDone ? "text-slate-400 line-through" : "text-slate-800"}`}>
            {task.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{task.projectName}</span>
            {task.area && (
              <span className={`rounded-full px-2 py-0.5 ${AREA_COLOR_BADGE[task.area.colorKey]}`}>
                {task.area.name}
              </span>
            )}
            {!isDone && (
              <span className={`rounded-full px-2 py-0.5 ${PRIORITY_COLORS[task.priority]}`}>
                {PRIORITY_LABELS[task.priority]}
              </span>
            )}
            {task.dueDate && <span>Vence {formatDue(task.dueDate)}</span>}
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="card p-5">
      {pending.length === 0 && done.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">Todavía no tienes ninguna actividad asignada.</p>
      )}

      {pending.length > 0 && (
        <ul>
          {pending.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}

      {pending.length === 0 && done.length > 0 && (
        <p className="py-6 text-center text-sm text-slate-400">No te queda ninguna actividad pendiente. 🎉</p>
      )}

      {done.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="text-xs font-medium text-slate-400 hover:text-brand-600"
          >
            {showDone ? "Ocultar" : "Ver"} terminadas ({done.length})
          </button>
          {showDone && (
            <ul className="mt-2">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
