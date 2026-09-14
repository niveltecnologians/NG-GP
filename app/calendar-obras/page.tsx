import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { visibleProjectTasks } from "@/lib/taskAccess";
import { recalculateTaskPriorities } from "@/lib/autoPriority";
import CalendarObrasView, { type CalendarTask } from "./CalendarObrasView";

// Calendario de obras: junta las actividades (tareas) de una obra puntual
// o de todas a la vez, en una vista de mes, respetando las mismas reglas
// de visibilidad que el tablero (por área, o solo lo asignado a uno
// mismo) y marcando las que están asignadas a los miembros del propio
// equipo de trabajo.

export default async function CalendarObrasPage() {
  const user = await requireUser();

  const projectWhere =
    user.role === "GERENTE"
      ? {}
      : { OR: [{ ownerId: user.userId }, { members: { some: { userId: user.userId } } }] };

  await recalculateTaskPriorities({ project: projectWhere });

  const [projects, myTeamMembers] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        ownerId: true,
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            areaId: true,
            area: { select: { id: true, name: true, colorKey: true } },
            startDate: true,
            dueDate: true,
            assignees: { select: { user: { select: { id: true, name: true } } } },
            teamAssignees: {
              select: { teamMember: { select: { id: true, name: true, title: true } } }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.teamMember.findMany({ where: { ownerId: user.userId }, select: { id: true } })
  ]);

  const myTeamMemberIds = new Set(myTeamMembers.map((tm) => tm.id));

  const tasks: CalendarTask[] = [];
  for (const project of projects) {
    const visibleTasks = visibleProjectTasks(
      project.tasks,
      project,
      { userId: user.userId, role: user.role, areaId: user.areaId, seesAllAreas: user.seesAllAreas },
      (t) => t.assignees.some((a) => a.user.id === user.userId)
    );
    for (const t of visibleTasks) {
      const teamAssignees = t.teamAssignees.map((ta) => ta.teamMember);
      tasks.push({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        areaId: t.areaId,
        area: t.area,
        startDate: t.startDate ? t.startDate.toISOString() : null,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        projectId: project.id,
        projectName: project.name,
        assignees: t.assignees.map((a) => a.user),
        teamAssignees,
        isMyTeam: teamAssignees.some((tm) => myTeamMemberIds.has(tm.id))
      });
    }
  }

  const obras = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calendario de obras</h1>
        <p className="text-sm text-slate-500">
          Actividades de tus obras por fecha. Elige una obra puntual o mira todas juntas, y filtra por área.
        </p>
      </div>
      <CalendarObrasView obras={obras} tasks={tasks} hasOwnTeam={myTeamMemberIds.size > 0} />
    </div>
  );
}
