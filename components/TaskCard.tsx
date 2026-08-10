"use client";

import { useState } from "react";
import {
  Task,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  AREA_LABELS,
  AREA_BADGE_COLORS,
  AREA_BORDER_COLORS,
  PHASE_LABELS,
  PHASE_BADGE_COLORS
} from "@/lib/types";
import { getDueState } from "@/lib/taskDates";

export default function TaskCard({
  task,
  onClick,
  onDragStart
}: {
  task: Task;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const [avatarError, setAvatarError] = useState(false);
  const initials = task.assignee ? task.assignee.name.slice(0, 2).toUpperCase() : "—";
  const dueState = getDueState(task.dueDate, task.status);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`card-interactive card group cursor-pointer p-3 active:cursor-grabbing ${
        task.area ? `border-l-4 ${AREA_BORDER_COLORS[task.area]}` : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 group-hover:text-brand-700">{task.title}</p>
        {task.assignee && !avatarError ? (
          <img
            src={`/api/users/${task.assignee.id}/avatar`}
            alt={task.assignee.name}
            title={task.assignee.name}
            onError={() => setAvatarError(true)}
            className="h-6 w-6 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700"
            title={task.assignee?.name || "Sin asignar"}
          >
            {initials}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
        {task.area && (
          <span className={`badge ${AREA_BADGE_COLORS[task.area]}`}>{AREA_LABELS[task.area]}</span>
        )}
        {task.phase && (
          <span className={`badge ${PHASE_BADGE_COLORS[task.phase]}`}>{PHASE_LABELS[task.phase]}</span>
        )}
        {task.attachments.length > 0 && (
          <span className="text-[11px] text-slate-400">📎 {task.attachments.length}</span>
        )}
        {task.subtasks.length > 0 && (
          <span
            className={`text-[11px] ${
              task.subtasks.every((s) => s.done) ? "font-medium text-emerald-600" : "text-slate-400"
            }`}
          >
            ☑ {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
          </span>
        )}
        {dueState === "done" && (
          <span className="text-[11px] font-medium text-emerald-600">✅ Realizada</span>
        )}
        {dueState !== "done" && task.dueDate && (
          <span
            className={`text-[11px] ${
              dueState === "overdue"
                ? "font-medium text-red-600"
                : dueState === "soon"
                ? "font-medium text-amber-600"
                : "text-slate-400"
            }`}
          >
            {dueState === "overdue" ? "Vencida · " : dueState === "soon" ? "Próxima a vencer · " : ""}
            {new Date(task.dueDate).toLocaleDateString("es-ES")}
          </span>
        )}
      </div>
    </div>
  );
}
