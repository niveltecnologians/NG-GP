import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import ReportsView from "./ReportsView";

export default async function ReportsPage() {
  const user = await requireUser();

  const projects = await prisma.project.findMany({
    where: { OR: [{ ownerId: user.userId }, { members: { some: { userId: user.userId } } }] },
    include: {
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
        <h1 className="text-2xl font-bold">Informe de proyecto</h1>
        <p className="text-sm text-slate-500">Resumen de estado y detalle de actividades por proyecto</p>
      </div>
      <ReportsView projects={data} />
    </div>
  );
}
