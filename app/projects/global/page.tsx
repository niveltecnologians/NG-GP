import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { recalculateTaskPriorities } from "@/lib/autoPriority";
import {
  TaskStatus,
  STATUS_LABELS,
  STATUS_DOT,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  AREA_LABELS,
  AREA_BADGE_COLORS,
  AREA_BORDER_COLORS
} from "@/lib/types";
import { getDueState } from "@/lib/taskDates";

// Orden de las columnas: primero las del modo "Tareas", después las del
// modo "Administrativo" (Prospectos, Diseño, Presupuesto, Ejecución,
// Liquidación, Pos venta) — solo se muestran las que tengan al menos una
// tarea, para no llenar la vista de columnas vacías.
const COLUMN_ORDER: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
  "PROSPECTOS",
  "DISENO",
  "PRESUPUESTO",
  "EJECUCION",
  "LIQUIDACION",
  "POSVENTA"
];

export default async function GlobalProjectsPage() {
  const user = await requireUser();

  const projectWhere = { OR: [{ ownerId: user.userId }, { members: { some: { userId: user.userId } } }] };

  // Pone al día la prioridad automática de todas estas tareas antes de
  // mostrarlas, por si cambió cuánto falta para alguna fecha límite.
  await recalculateTaskPriorities({ project: projectWhere });

  const projects = await prisma.project.findMany({
    where: projectWhere,
    select: {
      id: true,
      name: true,
      boardMode: true,
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          area: true,
          dueDate: true,
          assignee: { select: { id: true, name: true } },
          subtasks: { select: { done: true } }
        },
        orderBy: { dueDate: "asc" }
      }
    },
    orderBy: { name: "asc" }
  });

  type ColumnTask = {
    id: string;
    title: string;
    priority: keyof typeof PRIORITY_LABELS;
    area: keyof typeof AREA_LABELS | null;
    dueDate: Date | null;
    assignee: { id: string; name: string } | null;
    subtasks: { done: boolean }[];
    projectId: string;
    projectName: string;
  };

  const columns = new Map<TaskStatus, ColumnTask[]>();
  let totalTasks = 0;
  for (const project of projects) {
    for (const t of project.tasks) {
      totalTasks++;
      const status = t.status as TaskStatus;
      const list = columns.get(status) || [];
      list.push({ ...t, projectId: project.id, projectName: project.name });
      columns.set(status, list);
    }
  }

  const activeColumns = COLUMN_ORDER.filter((s) => (columns.get(s) || []).length > 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Proyectos globales</h1>
          <p className="text-sm text-slate-500">
            Todas las tareas de tus {projects.length} proyectos, agrupadas por estado ({totalTasks} en total). Toca una
            tarea para abrirla en su proyecto.
          </p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          Volver a mis proyectos
        </Link>
      </div>

      {activeColumns.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">Todavía no hay tareas en tus proyectos.</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {activeColumns.map((statusValue) => {
            const tasks = columns.get(statusValue) || [];
            return (
              <div key={statusValue} className="w-72 shrink-0">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[statusValue]}`} />
                  <h2 className="text-sm font-semibold text-slate-700">{STATUS_LABELS[statusValue]}</h2>
                  <span className="text-xs text-slate-400">({tasks.length})</span>
                </div>
                <div className="space-y-2">
                  {tasks.map((t) => {
                    const dueState = getDueState(t.dueDate ? t.dueDate.toISOString() : null, statusValue);
                    return (
                      <Link
                        key={t.id}
                        href={`/projects/${t.projectId}`}
                        className={`card block p-3 ${t.area ? `border-l-4 ${AREA_BORDER_COLORS[t.area]}` : ""}`}
                      >
                        <p className="text-sm font-medium text-slate-900">{t.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">{t.projectName}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={`badge ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</span>
                          {t.area && (
                            <span className={`badge ${AREA_BADGE_COLORS[t.area]}`}>{AREA_LABELS[t.area]}</span>
                          )}
                          {t.subtasks.length > 0 && (
                            <span className="text-[11px] text-slate-400">
                              ☑ {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
                            </span>
                          )}
                        </div>
                        {t.dueDate && (
                          <p
                            className={`mt-1 text-[11px] ${
                              dueState === "overdue"
                                ? "font-medium text-red-600"
                                : dueState === "soon"
                                ? "font-medium text-amber-600"
                                : "text-slate-400"
                            }`}
                          >
                            {dueState === "overdue" ? "Vencida · " : dueState === "soon" ? "Próxima a vencer · " : ""}
                            {new Date(t.dueDate).toLocaleDateString("es-ES")}
                          </p>
                        )}
                        {t.assignee && <p className="mt-1 text-[11px] text-slate-400">{t.assignee.name}</p>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
