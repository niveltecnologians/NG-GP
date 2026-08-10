"use client";

import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Task, ProjectMember, TaskStatus, PHASE_BAR_COLORS } from "@/lib/types";
import { isFinalStatus } from "@/lib/taskDates";
import { computeCriticalPath } from "@/lib/criticalPath";
import TaskModal from "@/components/TaskModal";

const DAY_WIDTH = 28; // px por día en la escala del cronograma
const ROW_HEIGHT = 34; // px por fila, igual en la tabla y en las barras
const METRIC_COL_WIDTH = 56; // cada columna de Inicio/Fin/Duración/Avance
const LABEL_WIDTH = 180 + METRIC_COL_WIDTH * 4; // ancho del panel de la izquierda (tipo Project)
const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function progressOf(task: Task) {
  if (task.subtasks.length > 0) {
    return Math.round((task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100);
  }
  return isFinalStatus(task.status) ? 100 : 0;
}

export default function GanttChart({
  tasks,
  setTasks,
  projectId,
  members,
  statusOptions
}: {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  projectId: string;
  members: ProjectMember[];
  statusOptions: TaskStatus[];
}) {
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined); // undefined = cerrado

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

  function handleSaved(task: Task) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task];
    });
  }

  function handleDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  const header = (
    <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-slate-500">
        Cronograma tipo diagrama de Gantt: cada actividad con fecha aparece como una barra. Marca de qué otras
        depende cada una para calcular la ruta crítica.
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          🖨️ Imprimir
        </button>
        <button type="button" className="btn" onClick={() => setEditingTask(null)}>
          + Nueva actividad
        </button>
      </div>
    </div>
  );

  if (results.length === 0) {
    return (
      <div>
        {header}
        <div className="card p-10 text-center text-slate-500">
          Agrega fecha de inicio y fecha límite a tus actividades para ver el cronograma. Si además marcas de qué
          otra tarea depende cada una, se calcula sola la ruta crítica.
        </div>
        {editingTask !== undefined && (
          <TaskModal
            projectId={projectId}
            members={members}
            statusOptions={statusOptions}
            task={editingTask}
            allTasks={tasks}
            onClose={() => setEditingTask(undefined)}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}
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

  // Ticks: un rótulo cada 7 días desde el inicio.
  const ticks: { offset: number; label: string }[] = [];
  for (let i = 0; i < totalDays; i += 7) {
    const d = new Date(minDate.getTime() + i * DAY_MS);
    ticks.push({ offset: i * DAY_WIDTH, label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) });
  }

  const sorted = [...results].sort((a, b) => a.es - b.es || a.start.getTime() - b.start.getTime());
  const rowIndex = new Map(sorted.map((r, i) => [r.id, i]));
  const criticalOrdered = sorted.filter((r) => r.critical);
  const criticalDuration = criticalOrdered.length > 0 ? Math.max(...criticalOrdered.map((r) => r.ef)) : 0;
  const today = dayKey(new Date());
  const chartHeight = sorted.length * ROW_HEIGHT;

  // Flechas de dependencia: de la barra que termina primero (predecesora) a
  // la que empieza después (sucesora), solo entre tareas que sí están en el
  // gráfico (con fecha).
  type Arrow = { fromX: number; fromY: number; toX: number; toY: number; midX: number };
  const arrows: Arrow[] = [];
  sorted.forEach((r) => {
    const task = byId.get(r.id);
    if (!task) return;
    task.dependsOn.forEach((dep) => {
      const predRow = rowIndex.get(dep.id);
      const predResult = results.find((x) => x.id === dep.id);
      const succRow = rowIndex.get(r.id);
      if (predRow === undefined || succRow === undefined || !predResult) return;
      const fromX = offsetOf(predResult.end);
      const fromY = predRow * ROW_HEIGHT + ROW_HEIGHT / 2;
      const toX = offsetOf(r.start);
      const toY = succRow * ROW_HEIGHT + ROW_HEIGHT / 2;
      arrows.push({ fromX, fromY, toX, toY, midX: fromX + Math.max((toX - fromX) / 2, 8) });
    });
  });

  return (
    <div>
      {header}

      <div className="gantt-printable space-y-4">
        {criticalOrdered.length > 0 && (
          <div className="card border-red-200 bg-red-50/60 p-4">
            <p className="text-sm font-semibold text-red-700">
              Ruta crítica ({criticalDuration} {criticalDuration === 1 ? "día" : "días"} en total)
            </p>
            <p className="mt-1 text-sm text-red-700">{criticalOrdered.map((r) => r.title).join(" → ")}</p>
            <p className="mt-1 text-xs text-red-500">
              Si cualquiera de estas actividades se atrasa, se atrasa todo el proyecto. Las demás tienen margen
              (holgura) antes de afectar la fecha final.
            </p>
          </div>
        )}

        <div className="card overflow-x-auto p-0">
          <div style={{ width: LABEL_WIDTH + chartWidth }}>
            {/* Encabezado: columnas de la tabla + regla de fechas */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              <div className="flex shrink-0" style={{ width: LABEL_WIDTH }}>
                <div className="min-w-0 flex-1 px-3 py-2">Actividad</div>
                <div className="shrink-0 px-1 py-2" style={{ width: METRIC_COL_WIDTH }}>Inicio</div>
                <div className="shrink-0 px-1 py-2" style={{ width: METRIC_COL_WIDTH }}>Fin</div>
                <div className="shrink-0 px-1 py-2" style={{ width: METRIC_COL_WIDTH }}>Duración</div>
                <div className="shrink-0 px-1 py-2" style={{ width: METRIC_COL_WIDTH }}>Avance</div>
              </div>
              <div className="relative shrink-0" style={{ width: chartWidth, height: 28 }}>
                {ticks.map((t) => (
                  <div key={t.offset} className="absolute top-1.5 -translate-x-1/2" style={{ left: t.offset }}>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Filas */}
            <div className="relative">
              {sorted.map((r, i) => {
                const task = byId.get(r.id);
                const progress = task ? progressOf(task) : 0;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center border-b border-slate-50 text-sm ${
                      i % 2 === 1 ? "bg-slate-50/50" : ""
                    }`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <button
                      type="button"
                      onClick={() => task && setEditingTask(task)}
                      className="flex shrink-0 items-center text-left hover:bg-slate-100"
                      style={{ width: LABEL_WIDTH }}
                    >
                      <span className="min-w-0 flex-1 truncate px-3 text-slate-800" title={r.title}>
                        {r.title}
                      </span>
                      <span
                        className="shrink-0 truncate px-1 text-[11px] text-slate-400"
                        style={{ width: METRIC_COL_WIDTH }}
                      >
                        {r.start.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <span
                        className="shrink-0 truncate px-1 text-[11px] text-slate-400"
                        style={{ width: METRIC_COL_WIDTH }}
                      >
                        {r.end.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <span
                        className="shrink-0 truncate px-1 text-[11px] text-slate-400"
                        style={{ width: METRIC_COL_WIDTH }}
                      >
                        {r.durationDays} {r.durationDays === 1 ? "día" : "días"}
                      </span>
                      <span
                        className="shrink-0 truncate px-1 text-[11px] text-slate-400"
                        style={{ width: METRIC_COL_WIDTH }}
                      >
                        {progress}%
                      </span>
                    </button>
                    <div className="relative shrink-0" style={{ width: chartWidth, height: ROW_HEIGHT }} />
                  </div>
                );
              })}

              {/* Barras y flechas, superpuestas sobre las filas */}
              <div
                className="pointer-events-none absolute top-0"
                style={{ left: LABEL_WIDTH, width: chartWidth, height: chartHeight }}
              >
                <svg width={chartWidth} height={chartHeight} className="absolute left-0 top-0">
                  <defs>
                    <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" className="fill-slate-400" />
                    </marker>
                  </defs>
                  {arrows.map((a, i) => (
                    <polyline
                      key={i}
                      points={`${a.fromX},${a.fromY} ${a.midX},${a.fromY} ${a.midX},${a.toY} ${a.toX},${a.toY}`}
                      fill="none"
                      className="stroke-slate-300"
                      strokeWidth={1.5}
                      markerEnd="url(#arrowhead)"
                    />
                  ))}
                </svg>

                {sorted.map((r, i) => {
                  const task = byId.get(r.id);
                  const left = offsetOf(r.start);
                  const width = Math.max((r.durationDays || 1) * DAY_WIDTH - 2, 6);
                  const barColor = r.critical
                    ? "bg-red-500"
                    : task?.phase
                    ? PHASE_BAR_COLORS[task.phase]
                    : "bg-brand-400";
                  const isToday = dayKey(r.start) <= today && today <= dayKey(r.end);
                  const progress = task ? progressOf(task) : 0;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => task && setEditingTask(task)}
                      className={`pointer-events-auto absolute h-5 rounded ${barColor} ${
                        isToday ? "ring-2 ring-offset-1 ring-brand-300" : ""
                      }`}
                      style={{ left, width, top: i * ROW_HEIGHT + ROW_HEIGHT / 2 - 10 }}
                      title={`${r.title}: ${r.start.toLocaleDateString("es-ES")} – ${r.end.toLocaleDateString(
                        "es-ES"
                      )} (${r.durationDays} ${r.durationDays === 1 ? "día" : "días"})${
                        r.critical ? " · ruta crítica" : ` · holgura ${r.slack} ${r.slack === 1 ? "día" : "días"}`
                      }`}
                    >
                      {progress > 0 && (
                        <span
                          className="block h-full rounded bg-black/25"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <p className="no-print text-xs text-slate-400">
          Las barras en rojo son la ruta crítica. El color de las demás corresponde a la fase de la actividad (o
          azul si no tiene fase); la parte oscura de la barra muestra el avance. Haz clic en una fila o barra para
          editar esa actividad. Las flechas muestran de qué depende cada una.
        </p>
      </div>

      {editingTask !== undefined && (
        <TaskModal
          projectId={projectId}
          members={members}
          statusOptions={statusOptions}
          task={editingTask}
          allTasks={tasks}
          onClose={() => setEditingTask(undefined)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
