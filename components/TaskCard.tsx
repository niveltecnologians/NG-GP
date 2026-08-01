"use client";

import { Task, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/types";

export default function TaskCard({
  task,
  onClick,
  onDragStart
}: {
  task: Task;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const initials = task.assignee ? task.assignee.name.slice(0, 2).toUpperCase() : "—";
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="card cursor-pointer p-3 hover:border-brand-400 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">{task.title}</p>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700"
          title={task.assignee?.name || "Sin asignar"}
        >
          {initials}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        {task.attachments.length > 0 && (
          <span className="text-[11px] text-slate-400">📎 {task.attachments.length}</span>
        )}
        {task.dueDate && (
          <span className={`text-[11px] ${overdue ? "text-red-600 font-medium" : "text-slate-400"}`}>
            {new Date(task.dueDate).toLocaleDateString("es-ES")}
          </span>
        )}
      </div>
    </div>
  );
}
