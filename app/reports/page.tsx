import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { recalculateTaskPriorities } from "@/lib/autoPriority";
import { canManageProjectTasks } from "@/lib/taskAccess";
import ReportsView from "./ReportsView";

export default async function ReportsPage() {
  const user = await requireUser();

  await recalculateTaskPriorities({
    project: { OR: [{ ownerId: user.userId }, { members: { some: { userId: user.userId } } }] }
  });

  const projects = await prisma.project.findMany({
    where: { OR: [{ ownerId: user.userId }, { members: { some: { userId: user.userId } } }] },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: {
        include: { assignees: { select: { user: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Igual que en el tablero: un miembro común solo ve, dentro de cada
  // proyecto, sus propias tareas asignadas (puede ser una de varias
  // personas asignadas); el dueño de ese proyecto y los administradores del
  // sistema ven las de todos.
  const data = projects.map((p) => {
    const canManage = canManageProjectTasks(p, user.userId, user.role);
    const visibleTasks = canManage
      ? p.tasks
      : p.tasks.filter((t) => t.assignees.some((a) => a.user.id === user.userId));
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      boardMode: p.boardMode,
      // El dueño también cuenta como "profesional" del proyecto para el
      // informe por persona, aunque no esté en la tabla de miembros.
      members: [
        p.owner,
        ...p.members.map((m) => m.user).filter((u) => u.id !== p.owner.id)
      ],
      tasks: visibleTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        assignees: t.assignees.map((a) => a.user)
      }))
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Informes</h1>
        <p className="text-sm text-slate-500">Resumen de estado y detalle de actividades por proyecto o por profesional</p>
      </div>
      <ReportsView projects={data} />
    </div>
  );
}
