import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { recalculateTaskPriorities } from "@/lib/autoPriority";
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
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const data = projects.map((p) => ({
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
    tasks: p.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      assignee: t.assignee
    }))
  }));

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
