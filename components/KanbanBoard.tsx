"use client";

import { useState } from "react";
import { ProjectDetail, Task, TaskStatus, STATUS_LABELS } from "@/lib/types";
import TaskCard from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

const COLUMN_DOT: Record<TaskStatus, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  REVIEW: "bg-amber-500",
  DONE: "bg-emerald-500"
};

export default function KanbanBoard({
  project,
  currentUserId
}: {
  project: ProjectDetail;
  currentUserId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(project.tasks);
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined); // undefined = cerrado

  function handleSaved(task: Task) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task];
    });
  }

  function handleDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function moveTask(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) moveTask(taskId, status);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button className="btn" onClick={() => setEditingTask(null)}>
          + Nueva tarea
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((status) => {
          const colTasks = tasks.filter((t) => t.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, status)}
              className="rounded-xl bg-slate-100/70 p-3 transition"
            >
              <h3 className="mb-3 flex items-center justify-between px-0.5 text-sm font-semibold text-slate-600">
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[status]}`} />
                  {STATUS_LABELS[status]}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-400 shadow-sm">
                  {colTasks.length}
                </span>
              </h3>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setEditingTask(task)}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
                    Sin tareas
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingTask !== undefined && (
        <TaskModal
          projectId={project.id}
          members={project.members}
          task={editingTask}
          onClose={() => setEditingTask(undefined)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
