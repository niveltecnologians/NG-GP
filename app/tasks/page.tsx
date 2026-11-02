import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { BOARD_MODE_COLUMNS } from "@/lib/types";
import TasksView, { type MyTask, type ExternalTask } from "./TasksView";

// "Tareas" tiene dos espacios separados:
//
// 1. Tareas externas: pendientes personales que el propio usuario agrega,
//    marca y borra a mano, sin ninguna obra asociada (estilo Google Tasks
//    "de verdad", una lista aparte solo suya).
//
// 2. Tareas de tus obras: junta, en un solo lugar, todas las actividades
//    que están asignadas al usuario en cualquiera de sus obras. Marcarlas
//    acá SÍ cambia su estado de verdad (es la misma tarea que ve todo el
//    equipo en el tablero de esa obra, no una copia aparte): se mueve a la
//    última columna del tablero de esa obra ("Terminado", o "Pos venta" en
//    el modo administrativo). Desmarcarla la regresa a la primera columna
//    de ese mismo tablero.
export default async function TasksPage() {
  const user = await requireUser();

  const [personalTasks, tasks] = await Promise.all([
    prisma.personalTask.findMany({
      where: { userId: user.userId },
      orderBy: [{ done: "asc" }, { createdAt: "desc" }]
    }),
    prisma.task.findMany({
      where: { assignees: { some: { userId: user.userId } } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        project: { select: { id: true, name: true, boardMode: true } },
        area: { select: { id: true, name: true, colorKey: true } }
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
    })
  ]);

  const myExternalTasks: ExternalTask[] = personalTasks.map((t) => ({
    id: t.id,
    title: t.title,
    done: t.done
  }));

  const myTasks: MyTask[] = tasks.map((t) => {
    const columns = BOARD_MODE_COLUMNS[t.project.boardMode];
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      area: t.area,
      projectId: t.project.id,
      projectName: t.project.name,
      doneStatus: columns[columns.length - 1],
      firstStatus: columns[0]
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tareas</h1>
        <p className="text-sm text-slate-500">
          Tus pendientes personales, y todas las actividades que tienes asignadas en tus obras.
        </p>
      </div>
      <TasksView initialExternalTasks={myExternalTasks} initialTasks={myTasks} />
    </div>
  );
}
