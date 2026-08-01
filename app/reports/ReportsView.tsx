"use client";

import { useState } from "react";

type TaskRow = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
};

type ProjectRow = { id: string; name: string; description: string | null; tasks: TaskRow[] };

const STATUS_LABELS: Record<string, string> = { TODO: "Por hacer", IN_PROGRESS: "En progreso", REVIEW: "En revisión", DONE: "Terminado" };
const PRIORITY_LABELS: Record<string, string> = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente" };
const STATUS_ORDER = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;

export default function ReportsView({ projects }: { projects: ProjectRow[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");

  if (projects.length === 0) {
    return <div className="card p-10 text-center text-slate-500">No perteneces a ningún proyecto todavía.</div>;
  }

  const project = projects.find((p) => p.id === projectId) || projects[0];
  const tasks = project.tasks;
  const total = tasks.length;
  const counts: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
  tasks.forEach((t) => counts[t.status]++);
  const pct = total > 0 ? Math.round((counts.DONE / total) * 100) : 0;
  const overdueCount = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;

  function exportCsv() {
    const rows = [["Tarea", "Estado", "Prioridad", "Responsable", "Fecha límite"]];
    tasks.forEach((t) => {
      rows.push([
        t.title,
        STATUS_LABELS[t.status],
        PRIORITY_LABELS[t.priority],
        t.assignee ? t.assignee.name : "Sin asignar",
        t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-ES") : ""
      ]);
    });
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe-${project.name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-4 print:hidden">
        <div>
          <label className="mb-1 block text-sm font-medium">Proyecto</label>
          <select className="input w-72" value={project.id} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportCsv}>Exportar CSV</button>
          <button className="btn-secondary" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </div>

      <h2 className="mb-1 text-lg font-semibold">{project.name}</h2>
      <p className="mb-4 text-sm text-slate-500">{project.description || "Sin descripción"}</p>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Total de tareas</div>
          <div className="text-2xl font-bold">{total}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Completado</div>
          <div className="text-2xl font-bold">{pct}%</div>
        </div>
        {STATUS_ORDER.map((s) => (
          <div key={s} className="card p-4">
            <div className="text-xs text-slate-500">{STATUS_LABELS[s]}</div>
            <div className="text-2xl font-bold">{counts[s]}</div>
          </div>
        ))}
        <div className="card p-4">
          <div className="text-xs text-slate-500">Vencidas</div>
          <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : ""}`}>{overdueCount}</div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium">Tarea</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Prioridad</th>
              <th className="px-4 py-2.5 font-medium">Responsable</th>
              <th className="px-4 py-2.5 font-medium">Fecha límite</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  Este proyecto aún no tiene tareas.
                </td>
              </tr>
            ) : (
              tasks.map((t) => {
                const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE";
                return (
                  <tr key={t.id} className="border-b border-slate-100 text-sm">
                    <td className="px-4 py-2.5">{t.title}</td>
                    <td className="px-4 py-2.5">{STATUS_LABELS[t.status]}</td>
                    <td className="px-4 py-2.5">{PRIORITY_LABELS[t.priority]}</td>
                    <td className="px-4 py-2.5">{t.assignee ? t.assignee.name : "Sin asignar"}</td>
                    <td className={`px-4 py-2.5 ${overdue ? "font-medium text-red-600" : ""}`}>
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-ES") : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
