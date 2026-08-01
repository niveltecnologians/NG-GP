"use client";

import { useState } from "react";
import { ProjectDetail, Task, TaskStatus, STATUS_LABELS } from "@/lib/types";
import TaskCard from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

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
        {COLUMNS.map((status) => (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, status)}
            className="rounded-lg bg-slate-100 p-3"
          >
            <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-600">
              {STATUS_LABELS[status]}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-400">
                {tasks.filter((t) => t.status === status).length}
              </span>
            </h3>
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status === status)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setEditingTask(task)}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                  />
                ))}
            </div>
          </div>
        ))}
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
