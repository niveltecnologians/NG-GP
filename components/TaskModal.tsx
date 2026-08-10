"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { safeBlobPathname } from "@/lib/blobPath";
import {
  Task,
  ProjectMember,
  TaskStatus,
  TaskPriority,
  TaskArea,
  TaskPhase,
  SubTask,
  ChecklistItem,
  TaskComment,
  STATUS_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  AREA_LABELS,
  AREA_BADGE_COLORS,
  PHASE_LABELS,
  PHASE_BADGE_COLORS
} from "@/lib/types";
import { computeAutoPriority } from "@/lib/priorityRules";

type Props = {
  projectId: string;
  members: ProjectMember[];
  statusOptions: TaskStatus[];
  task: Task | null; // null = modo creación
  allTasks: Task[]; // para elegir de qué tareas depende (ruta crítica / Gantt)
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDeleted: (taskId: string) => void;
};

export default function TaskModal({ projectId, members, statusOptions, task, allTasks, onClose, onSaved, onDeleted }: Props) {
  const [current, setCurrent] = useState<Task | null>(task);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || statusOptions[0]);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "MEDIUM");
  const [area, setArea] = useState<TaskArea | "">(task?.area || "");
  const [phase, setPhase] = useState<TaskPhase | "">(task?.phase || "");
  const [budget, setBudget] = useState(task?.budget !== null && task?.budget !== undefined ? String(task.budget) : "");
  const [assigneeId, setAssigneeId] = useState(task?.assignee?.id || "");
  const [startDate, setStartDate] = useState(task?.startDate ? task.startDate.slice(0, 10) : "");
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [dependsOnIds, setDependsOnIds] = useState<string[]>(task?.dependsOn.map((d) => d.id) || []);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDependsOn(id: string) {
    setDependsOnIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const [subtasks, setSubtasks] = useState<SubTask[]>(task?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  // Pasos internos de cada subtarea (mini lista de chequeo dentro de ella).
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [newSubtaskChecklistText, setNewSubtaskChecklistText] = useState<Record<string, string>>({});
  const [subtaskChecklistLoading, setSubtaskChecklistLoading] = useState<Record<string, boolean>>({});

  // Lista de chequeo de la tarea: independiente de las subtareas, solo
  // informativa (no completa la tarea sola).
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [checklistLoading, setChecklistLoading] = useState(false);

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  useEffect(() => {
    if (!task) return;
    fetch(`/api/tasks/${task.id}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setComments(data);
      })
      .catch(() => {})
      .finally(() => setCommentsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !newSubtask.trim()) return;
    setSubtaskLoading(true);
    const res = await fetch(`/api/tasks/${current.id}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSubtask.trim() })
    });
    setSubtaskLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo agregar la subtarea");
      return;
    }
    const created = await res.json();
    setNewSubtask("");
    setSubtasks((prev) => {
      const updated = [...prev, created];
      setCurrent((c) => (c ? { ...c, subtasks: updated } : c));
      return updated;
    });
  }

  async function handleToggleSubtask(subtask: SubTask) {
    if (!current) return;
    const res = await fetch(`/api/tasks/${current.id}/subtasks/${subtask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !subtask.done })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo actualizar la subtarea");
      return;
    }
    const { subtask: updatedSubtask, task: updatedTask } = await res.json();
    if (updatedTask) {
      // Se completaron todas las subtareas: la tarea pasó sola a su estado final.
      setCurrent(updatedTask);
      setStatus(updatedTask.status);
      setSubtasks(updatedTask.subtasks);
      onSaved(updatedTask);
    } else {
      setSubtasks((prev) => {
        const updated = prev.map((s) => (s.id === updatedSubtask.id ? updatedSubtask : s));
        setCurrent((c) => (c ? { ...c, subtasks: updated } : c));
        return updated;
      });
    }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    if (!current) return;
    const res = await fetch(`/api/tasks/${current.id}/subtasks/${subtaskId}`, { method: "DELETE" });
    if (res.ok) {
      setSubtasks((prev) => {
        const updated = prev.filter((s) => s.id !== subtaskId);
        setCurrent((c) => (c ? { ...c, subtasks: updated } : c));
        return updated;
      });
    }
  }

  function toggleExpandedSubtask(subtaskId: string) {
    setExpandedSubtasks((prev) => {
      const next = new Set(prev);
      if (next.has(subtaskId)) next.delete(subtaskId);
      else next.add(subtaskId);
      return next;
    });
  }

  async function handleAddSubtaskChecklistItem(subtaskId: string) {
    if (!current) return;
    const text = (newSubtaskChecklistText[subtaskId] || "").trim();
    if (!text) return;
    setSubtaskChecklistLoading((prev) => ({ ...prev, [subtaskId]: true }));
    const res = await fetch(`/api/tasks/${current.id}/subtasks/${subtaskId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    setSubtaskChecklistLoading((prev) => ({ ...prev, [subtaskId]: false }));
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo agregar el paso");
      return;
    }
    const created = await res.json();
    setNewSubtaskChecklistText((prev) => ({ ...prev, [subtaskId]: "" }));
    setSubtasks((prev) => {
      const updated = prev.map((s) => (s.id === subtaskId ? { ...s, checklist: [...s.checklist, created] } : s));
      setCurrent((c) => (c ? { ...c, subtasks: updated } : c));
      return updated;
    });
  }

  async function handleToggleSubtaskChecklistItem(subtaskId: string, item: ChecklistItem) {
    if (!current) return;
    const res = await fetch(`/api/tasks/${current.id}/subtasks/${subtaskId}/checklist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done })
    });
    if (!res.ok) return;
    const updated = await res.json();
    setSubtasks((prev) => {
      const next = prev.map((s) =>
        s.id === subtaskId ? { ...s, checklist: s.checklist.map((i) => (i.id === updated.id ? updated : i)) } : s
      );
      setCurrent((c) => (c ? { ...c, subtasks: next } : c));
      return next;
    });
  }

  async function handleDeleteSubtaskChecklistItem(subtaskId: string, itemId: string) {
    if (!current) return;
    const res = await fetch(`/api/tasks/${current.id}/subtasks/${subtaskId}/checklist/${itemId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      setSubtasks((prev) => {
        const next = prev.map((s) =>
          s.id === subtaskId ? { ...s, checklist: s.checklist.filter((i) => i.id !== itemId) } : s
        );
        setCurrent((c) => (c ? { ...c, subtasks: next } : c));
        return next;
      });
    }
  }

  async function handleAddChecklistItem(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !newChecklistItem.trim()) return;
    setChecklistLoading(true);
    const res = await fetch(`/api/tasks/${current.id}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newChecklistItem.trim() })
    });
    setChecklistLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo agregar el ítem");
      return;
    }
    const created = await res.json();
    setNewChecklistItem("");
    setChecklist((prev) => {
      const updated = [...prev, created];
      setCurrent((c) => (c ? { ...c, checklist: updated } : c));
      return updated;
    });
  }

  async function handleToggleChecklistItem(item: ChecklistItem) {
    if (!current) return;
    const res = await fetch(`/api/tasks/${current.id}/checklist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done })
    });
    if (!res.ok) return;
    const updated = await res.json();
    setChecklist((prev) => {
      const next = prev.map((i) => (i.id === updated.id ? updated : i));
      setCurrent((c) => (c ? { ...c, checklist: next } : c));
      return next;
    });
  }

  async function handleDeleteChecklistItem(itemId: string) {
    if (!current) return;
    const res = await fetch(`/api/tasks/${current.id}/checklist/${itemId}`, { method: "DELETE" });
    if (res.ok) {
      setChecklist((prev) => {
        const next = prev.filter((i) => i.id !== itemId);
        setCurrent((c) => (c ? { ...c, checklist: next } : c));
        return next;
      });
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !newComment.trim()) return;
    setCommentLoading(true);
    const res = await fetch(`/api/tasks/${current.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment.trim() })
    });
    setCommentLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo agregar la observación");
      return;
    }
    const created = await res.json();
    setComments((prev) => [...prev, created]);
    setNewComment("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!current) {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          projectId,
          assigneeId,
          priority,
          area: area || null,
          phase: phase || null,
          budget: budget === "" ? null : Number(budget),
          startDate,
          dueDate,
          status: statusOptions[0],
          dependsOnIds
        })
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
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          area: area || null,
          phase: phase || null,
          budget: budget === "" ? null : Number(budget),
          assigneeId,
          startDate,
          dueDate,
          dependsOnIds
        })
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
    const files = Array.from(e.target.files);
    e.target.value = "";
    setUploading(true);
    setError(null);

    // Se suben uno por uno; cada archivo que termina se agrega a la lista
    // sin tocar los que ya estaban (nunca se borra nada al adjuntar).
    for (const file of files) {
      try {
        const blob = await upload(safeBlobPathname(file.name), file, {
          access: "public",
          handleUploadUrl: "/api/blob/task-attachment",
          clientPayload: JSON.stringify({ taskId: current.id }),
          multipart: true
        });

        const res = await fetch(`/api/tasks/${current.id}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: blob.url,
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size
          })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(`"${file.name}": ${data.error || "no se pudo guardar"}`);
          continue;
        }
        const attachment = await res.json();
        setCurrent((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, attachments: [...prev.attachments, attachment] };
          onSaved(updated);
          return updated;
        });
      } catch (err) {
        setError(`"${file.name}": ${(err as Error).message || "no se pudo subir"}`);
      }
    }

    setUploading(false);
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
                {statusOptions.map((value) => (
                  <option key={value} value={value}>{STATUS_LABELS[value]}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Prioridad</label>
            {(() => {
              const auto = computeAutoPriority(dueDate || null, status);
              if (auto) {
                return (
                  <div>
                    <span className={`badge ${PRIORITY_COLORS[auto]}`}>{PRIORITY_LABELS[auto]}</span>
                    <p className="mt-1 text-[11px] text-slate-400">Automática, según la fecha límite</p>
                  </div>
                );
              }
              return (
                <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              );
            })()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Área</label>
            <select className="input" value={area} onChange={(e) => setArea(e.target.value as TaskArea | "")}>
              <option value="">Sin área</option>
              {Object.entries(AREA_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {area && (
              <span className={`badge mt-1 inline-block ${AREA_BADGE_COLORS[area as TaskArea]}`}>
                {AREA_LABELS[area as TaskArea]}
              </span>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Asignado a</label>
            <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Subtareas
            {subtasks.length > 0 && (
              <span className="ml-1 font-normal text-slate-400">
                ({subtasks.filter((s) => s.done).length}/{subtasks.length})
              </span>
            )}
          </label>
          {!current && <p className="text-xs text-slate-400">Guarda la tarea primero para poder agregar subtareas.</p>}
          {current && (
            <div className="space-y-2">
              <ul className="space-y-1">
                {subtasks.map((s) => (
                  <li key={s.id} className="rounded-md border border-slate-200 px-2 py-1 text-sm">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={s.done} onChange={() => handleToggleSubtask(s)} />
                      <span className={`flex-1 ${s.done ? "text-slate-400 line-through" : ""}`}>{s.title}</span>
                      <button
                        type="button"
                        onClick={() => toggleExpandedSubtask(s.id)}
                        className="shrink-0 text-xs text-slate-500 hover:underline"
                      >
                        {expandedSubtasks.has(s.id)
                          ? "Ocultar pasos"
                          : `Pasos${
                              s.checklist.length > 0
                                ? ` (${s.checklist.filter((i) => i.done).length}/${s.checklist.length})`
                                : ""
                            }`}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(s.id)}
                        className="shrink-0 text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                    {expandedSubtasks.has(s.id) && (
                      <div className="mt-2 space-y-1.5 border-t border-slate-100 pl-6 pt-2">
                        <ul className="space-y-1">
                          {s.checklist.map((i) => (
                            <li key={i.id} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={i.done}
                                onChange={() => handleToggleSubtaskChecklistItem(s.id, i)}
                              />
                              <span className={`flex-1 ${i.done ? "text-slate-400 line-through" : ""}`}>{i.text}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubtaskChecklistItem(s.id, i.id)}
                                className="shrink-0 text-red-600 hover:underline"
                              >
                                Eliminar
                              </button>
                            </li>
                          ))}
                          {s.checklist.length === 0 && <li className="text-xs text-slate-400">Sin pasos aún</li>}
                        </ul>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddSubtaskChecklistItem(s.id);
                          }}
                          className="flex gap-2"
                        >
                          <input
                            className="input flex-1 text-xs"
                            placeholder="Nuevo paso"
                            value={newSubtaskChecklistText[s.id] || ""}
                            onChange={(e) =>
                              setNewSubtaskChecklistText((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                          />
                          <button
                            type="submit"
                            disabled={subtaskChecklistLoading[s.id] || !(newSubtaskChecklistText[s.id] || "").trim()}
                            className="btn-secondary shrink-0 text-xs"
                          >
                            Agregar
                          </button>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
                {subtasks.length === 0 && <li className="text-xs text-slate-400">Sin subtareas aún</li>}
              </ul>
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Nueva subtarea"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                />
                <button type="submit" disabled={subtaskLoading || !newSubtask.trim()} className="btn-secondary shrink-0 text-sm">
                  Agregar
                </button>
              </form>
              {subtasks.length > 0 && (
                <p className="text-xs text-slate-400">
                  Al tildar todas, la tarea pasa sola a su estado final. "Pasos" es una mini lista de chequeo dentro
                  de cada subtarea.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Lista de chequeo
            {checklist.length > 0 && (
              <span className="ml-1 font-normal text-slate-400">
                ({checklist.filter((i) => i.done).length}/{checklist.length})
              </span>
            )}
          </label>
          {!current && (
            <p className="text-xs text-slate-400">Guarda la tarea primero para poder agregar la lista de chequeo.</p>
          )}
          {current && (
            <div className="space-y-2">
              <ul className="space-y-1">
                {checklist.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-sm">
                    <input type="checkbox" checked={i.done} onChange={() => handleToggleChecklistItem(i)} />
                    <span className={`flex-1 ${i.done ? "text-slate-400 line-through" : ""}`}>{i.text}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteChecklistItem(i.id)}
                      className="shrink-0 text-xs text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
                {checklist.length === 0 && <li className="text-xs text-slate-400">Sin ítems aún</li>}
              </ul>
              <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Nuevo ítem"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={checklistLoading || !newChecklistItem.trim()}
                  className="btn-secondary shrink-0 text-sm"
                >
                  Agregar
                </button>
              </form>
              <p className="text-xs text-slate-400">
                Es independiente de las subtareas: marcar estos ítems no cambia el estado de la tarea.
              </p>
            </div>
          )}
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
              <input type="file" multiple onChange={handleUpload} disabled={uploading} className="text-sm" />
              {uploading && <p className="text-xs text-slate-400">Subiendo...</p>}
              <p className="text-xs text-slate-400">Puedes seleccionar varios archivos a la vez; los anteriores no se borran.</p>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Observaciones</label>
          {!current && <p className="text-xs text-slate-400">Guarda la tarea primero para poder dejar observaciones.</p>}
          {current && (
            <div className="space-y-2">
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm">
                    <p className="whitespace-pre-wrap text-slate-700">{c.content}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {c.author?.name || "Alguien"} · {new Date(c.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                ))}
                {commentsLoaded && comments.length === 0 && (
                  <p className="text-xs text-slate-400">Sin observaciones aún</p>
                )}
              </div>
              <form onSubmit={handleAddComment} className="flex gap-2">
                <textarea
                  className="input flex-1"
                  rows={2}
                  placeholder="Escribe una observación..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={commentLoading || !newComment.trim()}
                  className="btn-secondary shrink-0 self-end text-sm"
                >
                  Agregar
                </button>
              </form>
              <p className="text-xs text-slate-400">Quedan como historial: no se pueden editar ni borrar después.</p>
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cronograma y presupuesto</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Fase</label>
              <select className="input" value={phase} onChange={(e) => setPhase(e.target.value as TaskPhase | "")}>
                <option value="">Sin fase</option>
                {Object.entries(PHASE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {phase && (
                <span className={`badge mt-1 inline-block ${PHASE_BADGE_COLORS[phase as TaskPhase]}`}>
                  {PHASE_LABELS[phase as TaskPhase]}
                </span>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Presupuesto (COP)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="input"
                placeholder="Sin definir"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha de inicio</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha límite</label>
              <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {allTasks.filter((t) => t.id !== current?.id).length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">Depende de</label>
              <p className="mb-1 text-xs text-slate-400">
                No puede empezar hasta que terminen estas tareas. Se usa para calcular la ruta crítica en el
                cronograma.
              </p>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                {allTasks
                  .filter((t) => t.id !== current?.id)
                  .map((t) => (
                    <label key={t.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={dependsOnIds.includes(t.id)}
                        onChange={() => toggleDependsOn(t.id)}
                      />
                      <span className="truncate">{t.title}</span>
                    </label>
                  ))}
              </div>
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
