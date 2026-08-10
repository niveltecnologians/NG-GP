"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { ProjectDetail, Task, TaskStatus, STATUS_LABELS, STATUS_DOT, BOARD_MODE_COLUMNS } from "@/lib/types";
import TaskCard from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";

export default function KanbanBoard({
  project,
  currentUserId,
  tasks,
  setTasks
}: {
  project: ProjectDetail;
  currentUserId: string;
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
}) {
  const COLUMNS = BOARD_MODE_COLUMNS[project.boardMode || "TASKS"];
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

      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
          COLUMNS.length > 4 ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-4"
        }`}
      >
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
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
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
          statusOptions={COLUMNS}
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
