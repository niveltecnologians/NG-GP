"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TaskStatus,
  TaskPriority,
  TaskArea,
  AREA_LABELS,
  AREA_BADGE_COLORS,
  AREA_BORDER_COLORS
} from "@/lib/types";
import { getDueState } from "@/lib/taskDates";

export type CalendarTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  area: TaskArea | null;
  startDate: string | null;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  assignees: { id: string; name: string }[];
  teamAssignees: { id: string; name: string; title: string | null }[];
  isMyTeam: boolean;
};

type Props = {
  obras: { id: string; name: string }[];
  tasks: CalendarTask[];
  hasOwnTeam: boolean;
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Fecha local en formato AAAA-MM-DD (sin pasar por UTC, para no correr el
// día según la zona horaria del servidor).
function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    cells.push({ date: new Date(year, month, dayNum), inMonth: dayNum >= 1 && dayNum <= daysInMonth });
  }
  return cells;
}

type DayEntry = { task: CalendarTask; kind: "inicio" | "vence" };

export default function CalendarObrasView({ obras, tasks, hasOwnTeam }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [obraId, setObraId] = useState<string>("ALL");
  const [area, setArea] = useState<TaskArea | "">("");
  const [onlyMyTeam, setOnlyMyTeam] = useState(false);

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (obraId === "ALL" || t.projectId === obraId) &&
          (!area || t.area === area) &&
          (!onlyMyTeam || t.isMyTeam)
      ),
    [tasks, obraId, area, onlyMyTeam]
  );

  // Una tarea aparece en su fecha límite (si tiene) y, si además tiene una
  // fecha de inicio distinta, también ahí — así se ve tanto cuándo
  // arranca como cuándo vence.
  const byDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const t of filtered) {
      const dueKey = t.dueDate ? t.dueDate.slice(0, 10) : null;
      if (dueKey) {
        map.set(dueKey, [...(map.get(dueKey) || []), { task: t, kind: "vence" }]);
      }
      if (t.startDate) {
        const startKey = t.startDate.slice(0, 10);
        if (startKey !== dueKey) {
          map.set(startKey, [...(map.get(startKey) || []), { task: t, kind: "inicio" }]);
        }
      }
    }
    return map;
  }, [filtered]);

  const withoutDate = filtered.filter((t) => !t.startDate && !t.dueDate);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const todayKey = dateKey(new Date());

  function goToMonth(offset: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + offset, 1));
  }

  function goToday() {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  function who(t: CalendarTask) {
    return [...t.assignees.map((a) => a.name), ...t.teamAssignees.map((tm) => tm.name)].join(", ");
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Obra</label>
          <select className="input" value={obraId} onChange={(e) => setObraId(e.target.value)}>
            <option value="ALL">Todas las obras</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Área</label>
          <select className="input" value={area} onChange={(e) => setArea(e.target.value as TaskArea | "")}>
            <option value="">Todas las áreas</option>
            {Object.entries(AREA_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {hasOwnTeam && (
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyMyTeam} onChange={(e) => setOnlyMyTeam(e.target.checked)} />
            Solo mi equipo
          </label>
        )}
        <div className="ml-auto mb-0.5 flex items-center gap-2">
          <button type="button" onClick={() => goToMonth(-1)} className="btn-secondary px-3 py-1.5" aria-label="Mes anterior">
            ‹
          </button>
          <button type="button" onClick={goToday} className="btn-secondary px-3 py-1.5 text-sm">
            Hoy
          </button>
          <button type="button" onClick={() => goToMonth(1)} className="btn-secondary px-3 py-1.5" aria-label="Mes siguiente">
            ›
          </button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-center text-lg font-semibold capitalize text-slate-800">{monthLabel}</h2>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map(({ date, inMonth }) => {
            const key = dateKey(date);
            const entries = byDay.get(key) || [];
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`min-h-24 rounded-md border p-1 text-left align-top ${
                  inMonth ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
                } ${isToday ? "ring-2 ring-brand-400" : ""}`}
              >
                <p className={`mb-1 text-[11px] ${inMonth ? "text-slate-500" : "text-slate-300"}`}>{date.getDate()}</p>
                <div className="space-y-0.5">
                  {entries.slice(0, 4).map(({ task, kind }, idx) => {
                    const dueState = kind === "vence" ? getDueState(task.dueDate, task.status) : "normal";
                    return (
                      <Link
                        key={`${task.id}-${kind}-${idx}`}
                        href={`/projects/${task.projectId}`}
                        title={`${task.projectName}: ${task.title}${who(task) ? " — " + who(task) : ""}`}
                        className={`block truncate rounded px-1 py-0.5 text-[10px] leading-tight hover:opacity-80 ${
                          task.area ? `border-l-2 ${AREA_BORDER_COLORS[task.area]}` : ""
                        } ${
                          dueState === "overdue"
                            ? "bg-red-50 text-red-700"
                            : dueState === "soon"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        {kind === "inicio" ? "▶ " : ""}
                        {task.isMyTeam ? "👥 " : ""}
                        {task.title}
                      </Link>
                    );
                  })}
                  {entries.length > 4 && <p className="text-[10px] text-slate-400">+{entries.length - 4} más</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {withoutDate.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Sin fecha ({withoutDate.length})</h3>
          <ul className="space-y-1">
            {withoutDate.map((t) => (
              <li key={t.id}>
                <Link href={`/projects/${t.projectId}`} className="text-sm text-brand-600 hover:underline">
                  {t.projectName}: {t.title}
                </Link>
                {t.area && <span className={`badge ml-2 ${AREA_BADGE_COLORS[t.area]}`}>{AREA_LABELS[t.area]}</span>}
                {t.isMyTeam && <span className="ml-2 text-xs text-slate-400">👥 mi equipo</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card p-10 text-center text-slate-500">No hay actividades con estos filtros.</div>
      )}
    </div>
  );
}

