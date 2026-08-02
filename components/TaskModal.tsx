"use client";

import { useState } from "react";
import {
  Task,
  ProjectMember,
  TaskStatus,
  TaskPriority,
  STATUS_LABELS,
  PRIORITY_LABELS
} from "@/lib/types";

type Props = {
  projectId: string;
  members: ProjectMember[];
  task: Task | null; // null = modo creación
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDeleted: (taskId: string) => void;
};

export default function TaskModal({ projectId, members, task, onClose, onSaved, onDeleted }: Props) {
  const [current, setCurrent] = useState<Task | null>(task);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "TODO");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "MEDIUM");
  const [assigneeId, setAssigneeId] = useState(task?.assignee?.id || "");
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!current) {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, projectId, assigneeId, priority, dueDate })
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al crear la tarea");
        return;
      }
      const created = await res.json();
      setCurrent(created);
      onSaved(created);
    } else {
      const res = await fetch(`/api/tasks/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, status, priority, assigneeId, dueDate })
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al actualizar la tarea");
        return;
      }
      const updated = await res.json();
      setCurrent(updated);
      onSaved(updated);
    }
  }

  async function handleDelete() {
    if (!current) return;
    if (!confirm("¿Eliminar esta tarea? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/tasks/${current.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted(current.id);
      onClose();
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!current) return;
    if (!confirm("¿Eliminar este archivo? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
    if (res.ok) {
      const updatedAttachments = current.attachments.filter((a) => a.id !== attachmentId);
      const updatedTask = { ...current, attachments: updatedAttachments };
      setCurrent(updatedTask);
      onSaved(updatedTask);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "No se pudo eliminar el archivo");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!current || !e.target.files?.length) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", e.target.files[0]);
    const res = await fetch(`/api/tasks/${current.id}/attachments`, { method: "POST", body: form });
    setUploading(false);
    e.target.value = "";
    if (res.ok) {
      const attachment = await res.json();
      setCurrent({ ...current, attachments: [...current.attachments, attachment] });
      onSaved({ ...current, attachments: [...current.attachments, attachment] });
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="card max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto p-6"
      >
        <h2 className="text-lg font-semibold">{current ? "Editar tarea" : "Nueva tarea"}</h2>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium">Título</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Descripción</label>
          <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {current && (
            <div>
              <label className="mb-1 block text-sm font-medium">Estado</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Prioridad</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Asignado a</label>
            <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha límite</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Archivos adjuntos</label>
          {!current && <p className="text-xs text-slate-400">Guarda la tarea primero para poder adjuntar archivos.</p>}
          {current && (
            <div className="space-y-2">
              <ul className="space-y-1">
                {current.attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1 text-sm">
                    <span className="truncate" title={a.filename}>{a.filename}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <a href={`/api/attachments/${a.id}`} className="text-brand-600 hover:underline" download>
                        Descargar
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(a.id)}
                        className="text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </span>
                  </li>
                ))}
                {current.attachments.length === 0 && <li className="text-xs text-slate-400">Sin archivos aún</li>}
              </ul>
              <input type="file" onChange={handleUpload} disabled={uploading} className="text-sm" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {current && (
              <button type="button" onClick={handleDelete} className="text-sm text-red-600 hover:underline">
                Eliminar tarea
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button type="submit" disabled={loading} className="btn">
              {loading ? "Guardando..." : current ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
