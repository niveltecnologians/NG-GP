"use client";

import { useState } from "react";
import { TaskStatus, STATUS_LABELS, BOARD_MODE_COLUMNS, BoardMode } from "@/lib/types";

type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
};

type MemberRow = { id: string; name: string; email: string };

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  boardMode: BoardMode;
  members: MemberRow[];
  tasks: TaskRow[];
};

const PRIORITY_LABELS: Record<string, string> = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente" };

// "DONE" y "POSVENTA" son la última columna de cada modo de tablero
// (Tareas y Administrativo): ahí una tarea ya no cuenta como pendiente/vencida.
function isFinalStatus(status: TaskStatus) {
  return status === "DONE" || status === "POSVENTA";
}

function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const allRows = [headers, ...rows];
  const csv = allRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsView({ projects }: { projects: ProjectRow[] }) {
  const [view, setView] = useState<"project" | "professional">("project");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");

  // Todas las personas que aparecen en algún proyecto al que tengo acceso
  // (dueños y miembros), sin repetir.
  const professionalsMap = new Map<string, MemberRow>();
  projects.forEach((p) => p.members.forEach((m) => professionalsMap.set(m.id, m)));
  const professionals = Array.from(professionalsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const [professionalId, setProfessionalId] = useState(professionals[0]?.id || "");

  if (projects.length === 0) {
    return <div className="card p-10 text-center text-slate-500">No perteneces a ningún proyecto todavía.</div>;
  }

  return (
    <div>
      <div className="mb-5 flex gap-2 print:hidden">
        <button className={view === "project" ? "btn" : "btn-secondary"} onClick={() => setView("project")}>
          Por proyecto
        </button>
        <button className={view === "professional" ? "btn" : "btn-secondary"} onClick={() => setView("professional")}>
          Por profesional
        </button>
      </div>

      {view === "project" ? (
        <ProjectReport projects={projects} projectId={projectId} setProjectId={setProjectId} />
      ) : (
        <ProfessionalReport
          projects={projects}
          professionals={professionals}
          professionalId={professionalId}
          setProfessionalId={setProfessionalId}
        />
      )}
    </div>
  );
}

function ProjectReport({
  projects,
  projectId,
  setProjectId
}: {
  projects: ProjectRow[];
  projectId: string;
  setProjectId: (id: string) => void;
}) {
  const project = projects.find((p) => p.id === projectId) || projects[0];
  const tasks = project.tasks;
  const total = tasks.length;
  const STATUS_ORDER = BOARD_MODE_COLUMNS[project.boardMode || "TASKS"];
  const doneStatus = STATUS_ORDER[STATUS_ORDER.length - 1];
  const counts: Record<string, number> = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
  tasks.forEach((t) => {
    if (counts[t.status] === undefined) counts[t.status] = 0;
    counts[t.status]++;
  });
  const pct = total > 0 ? Math.round((counts[doneStatus] / total) * 100) : 0;
  const overdueCount = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== doneStatus).length;

  function handleExport() {
    exportCsv(
      `informe-${project.name.replace(/\s+/g, "_")}.csv`,
      ["Tarea", "Estado", "Prioridad", "Responsable", "Fecha límite"],
      tasks.map((t) => [
        t.title,
        STATUS_LABELS[t.status],
        PRIORITY_LABELS[t.priority],
        t.assignee ? t.assignee.name : "Sin asignar",
        t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-ES") : ""
      ])
    );
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
          <button className="btn-secondary" onClick={handleExport}>Exportar CSV</button>
          <button className="btn-secondary" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </div>

      <h2 className="mb-1 text-lg font-semibold">{project.name}</h2>
      <p className="mb-4 text-sm text-slate-500">{project.description || "Sin descripción"}</p>

      <div
        className={`mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 ${
          STATUS_ORDER.length > 4 ? "lg:grid-cols-4 xl:grid-cols-8" : "lg:grid-cols-6"
        }`}
      >
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
                const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== doneStatus;
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

function ProfessionalReport({
  projects,
  professionals,
  professionalId,
  setProfessionalId
}: {
  projects: ProjectRow[];
  professionals: MemberRow[];
  professionalId: string;
  setProfessionalId: (id: string) => void;
}) {
  if (professionals.length === 0) {
    return <div className="card p-10 text-center text-slate-500">Todavía no hay personas en tus proyectos.</div>;
  }

  const professional = professionals.find((p) => p.id === professionalId) || professionals[0];

  // Proyectos donde esta persona es miembro (o dueño), o tiene al menos una
  // tarea asignada (por si ya no figura como miembro pero le quedó algo).
  const myProjects = projects.filter(
    (p) => p.members.some((m) => m.id === professional.id) || p.tasks.some((t) => t.assignee?.id === professional.id)
  );

  const perProject = myProjects.map((p) => {
    const myTasks = p.tasks.filter((t) => t.assignee?.id === professional.id);
    const doneStatus = BOARD_MODE_COLUMNS[p.boardMode || "TASKS"].slice(-1)[0];
    const done = myTasks.filter((t) => t.status === doneStatus).length;
    return { project: p, myTasks, done };
  });

  const allTasks = perProject.flatMap(({ project, myTasks }) =>
    myTasks.map((t) => ({ ...t, projectId: project.id, projectName: project.name }))
  );

  const total = allTasks.length;
  const doneTotal = allTasks.filter((t) => isFinalStatus(t.status)).length;
  const pct = total > 0 ? Math.round((doneTotal / total) * 100) : 0;
  const overdueCount = allTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && !isFinalStatus(t.status)
  ).length;
  const activeProjects = perProject.filter(({ myTasks }) => myTasks.length > 0).length;

  function handleExport() {
    exportCsv(
      `informe-${professional.name.replace(/\s+/g, "_")}.csv`,
      ["Proyecto", "Tarea", "Estado", "Prioridad", "Fecha límite"],
      allTasks.map((t) => [
        t.projectName,
        t.title,
        STATUS_LABELS[t.status],
        PRIORITY_LABELS[t.priority],
        t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-ES") : ""
      ])
    );
  }

  return (
    <div>
      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-4 print:hidden">
        <div>
          <label className="mb-1 block text-sm font-medium">Profesional</label>
          <select className="input w-72" value={professional.id} onChange={(e) => setProfessionalId(e.target.value)}>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleExport}>Exportar CSV</button>
          <button className="btn-secondary" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </div>

      <h2 className="mb-1 text-lg font-semibold">{professional.name}</h2>
      <p className="mb-4 text-sm text-slate-500">{professional.email}</p>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Proyectos activos</div>
          <div className="text-2xl font-bold">{activeProjects}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Total de tareas</div>
          <div className="text-2xl font-bold">{total}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Completado</div>
          <div className="text-2xl font-bold">{pct}%</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Terminadas</div>
          <div className="text-2xl font-bold">{doneTotal}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Vencidas</div>
          <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : ""}`}>{overdueCount}</div>
        </div>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-slate-700">Proyectos en los que está trabajando</h3>
      {perProject.length === 0 ? (
        <div className="card mb-5 p-6 text-center text-sm text-slate-400">No pertenece a ningún proyecto todavía.</div>
      ) : (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perProject.map(({ project, myTasks, done }) => (
            <div key={project.id} className="card p-4">
              <p className="font-medium text-slate-900">{project.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {myTasks.length} tarea{myTasks.length === 1 ? "" : "s"} asignada{myTasks.length === 1 ? "" : "s"}
                {myTasks.length > 0 && ` · ${done} terminada${done === 1 ? "" : "s"}`}
              </p>
            </div>
          ))}
        </div>
      )}

      <h3 className="mb-2 text-sm font-semibold text-slate-700">Detalle de tareas asignadas</h3>
      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium">Proyecto</th>
              <th className="px-4 py-2.5 font-medium">Tarea</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Prioridad</th>
              <th className="px-4 py-2.5 font-medium">Fecha límite</th>
            </tr>
          </thead>
          <tbody>
            {allTasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  No tiene tareas asignadas todavía.
                </td>
              </tr>
            ) : (
              allTasks.map((t) => {
                const overdue = t.dueDate && new Date(t.dueDate) < new Date() && !isFinalStatus(t.status);
                return (
                  <tr key={t.id} className="border-b border-slate-100 text-sm">
                    <td className="px-4 py-2.5">{t.projectName}</td>
                    <td className="px-4 py-2.5">{t.title}</td>
                    <td className="px-4 py-2.5">{STATUS_LABELS[t.status]}</td>
                    <td className="px-4 py-2.5">{PRIORITY_LABELS[t.priority]}</td>
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
