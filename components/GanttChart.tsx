"use client";

import { useMemo } from "react";
import { Task, PHASE_BAR_COLORS } from "@/lib/types";
import { computeCriticalPath } from "@/lib/criticalPath";

const DAY_WIDTH = 28; // px por día en la escala del cronograma
const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function GanttChart({ tasks }: { tasks: Task[] }) {
  const results = useMemo(
    () =>
      computeCriticalPath(
        tasks.map((t) => ({
          id: t.id,
          title: t.title,
          startDate: t.startDate,
          dueDate: t.dueDate,
          dependsOnIds: t.dependsOn.map((d) => d.id)
        }))
      ),
    [tasks]
  );

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  if (results.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-500">
        Agrega fecha de inicio y fecha límite a tus tareas para ver el cronograma. Si además marcas de qué otra tarea
        depende cada una, se calcula sola la ruta crítica.
      </div>
    );
  }

  const minDate = new Date(Math.min(...results.map((r) => r.start.getTime())));
  const maxDate = new Date(Math.max(...results.map((r) => r.end.getTime())));
  const totalDays = Math.max(Math.round((maxDate.getTime() - minDate.getTime()) / DAY_MS) + 1, 1);
  const chartWidth = totalDays * DAY_WIDTH;

  function offsetOf(date: Date) {
    return Math.round((date.getTime() - minDate.getTime()) / DAY_MS) * DAY_WIDTH;
  }

  // Ticks: un rótulo cada 7 días desde el inicio, más el primer día.
  const ticks: { offset: number; label: string }[] = [];
  for (let i = 0; i < totalDays; i += 7) {
    const d = new Date(minDate.getTime() + i * DAY_MS);
    ticks.push({ offset: i * DAY_WIDTH, label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) });
  }

  const sorted = [...results].sort((a, b) => a.es - b.es || a.start.getTime() - b.start.getTime());
  const criticalOrdered = sorted.filter((r) => r.critical);
  const criticalDuration = criticalOrdered.length > 0 ? Math.max(...criticalOrdered.map((r) => r.ef)) : 0;

  const today = dayKey(new Date());

  return (
    <div className="space-y-4">
      {criticalOrdered.length > 0 && (
        <div className="card border-red-200 bg-red-50/60 p-4">
          <p className="text-sm font-semibold text-red-700">
            Ruta crítica ({criticalDuration} {criticalDuration === 1 ? "día" : "días"} en total)
          </p>
          <p className="mt-1 text-sm text-red-700">
            {criticalOrdered.map((r) => r.title).join(" → ")}
          </p>
          <p className="mt-1 text-xs text-red-500">
            Si cualquiera de estas tareas se atrasa, se atrasa todo el proyecto. Las demás tienen margen (holgura)
            antes de afectar la fecha final.
          </p>
        </div>
      )}

      <div className="card overflow-x-auto p-4">
        <div style={{ width: Math.max(chartWidth + 260, 500) }}>
          {/* Regla de fechas */}
          <div className="relative mb-2 ml-64 h-6 border-b border-slate-200" style={{ width: chartWidth }}>
            {ticks.map((t) => (
              <div
                key={t.offset}
                className="absolute top-0 -translate-x-1/2 text-[10px] text-slate-400"
                style={{ left: t.offset }}
              >
                {t.label}
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            {sorted.map((r) => {
              const task = byId.get(r.id);
              const left = offsetOf(r.start);
              const width = Math.max((r.durationDays || 1) * DAY_WIDTH - 2, 6);
              const barColor = r.critical
                ? "bg-red-500"
                : task?.phase
                ? PHASE_BAR_COLORS[task.phase]
                : "bg-brand-400";
              const isToday = dayKey(r.start) <= today && today <= dayKey(r.end);
              return (
                <div key={r.id} className="flex items-center">
                  <div className="w-64 shrink-0 truncate pr-2 text-sm text-slate-700" title={task?.title}>
                    {task?.title}
                    {task?.assignee && <span className="text-slate-400"> · {task.assignee.name}</span>}
                  </div>
                  <div className="relative h-6" style={{ width: chartWidth }}>
                    <div
                      className={`absolute top-0.5 h-5 rounded ${barColor} ${
                        isToday ? "ring-2 ring-offset-1 ring-brand-300" : ""
                      }`}
                      style={{ left, width }}
                      title={`${r.title}: ${r.start.toLocaleDateString("es-ES")} – ${r.end.toLocaleDateString(
                        "es-ES"
                      )} (${r.durationDays} ${r.durationDays === 1 ? "día" : "días"})${
                        r.critical ? " · ruta crítica" : ` · holgura ${r.slack} ${r.slack === 1 ? "día" : "días"}`
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Las barras en rojo son la ruta crítica. El color de las demás corresponde a la fase de la tarea (o azul si no
        tiene fase). Pasa el mouse sobre una barra para ver fechas y holgura.
      </p>
    </div>
  );
}
