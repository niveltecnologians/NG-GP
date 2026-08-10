import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import ProjectTabs from "./ProjectTabs";
import AddMemberForm from "./AddMemberForm";
import EditProjectForm from "./EditProjectForm";
import ProjectMembersList from "./ProjectMembersList";
import { TASK_FULL_INCLUDE } from "@/lib/selects";
import { recalculateTaskPriorities } from "@/lib/autoPriority";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const user = await requireUser();

  // Antes de mostrar el tablero, se pone al día la prioridad automática de
  // las tareas de este proyecto (por si cambió cuánto falta para la fecha
  // límite desde la última vez que alguien lo vio).
  await recalculateTaskPriorities({ projectId: params.id });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: {
        include: TASK_FULL_INCLUDE,
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!project) notFound();

  const isMember =
    project.ownerId === user.userId || project.members.some((m) => m.userId === user.userId);
  if (!isMember) notFound();

  const isOwner = project.ownerId === user.userId;
  const canManage = isOwner || user.role === "ADMIN";

  const serialized = {
    ...project,
    tasks: project.tasks.map((t) => ({
      ...t,
      startDate: t.startDate ? t.startDate.toISOString() : null,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      attachments: t.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
      subtasks: t.subtasks.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        checklist: s.checklist.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))
      })),
      checklist: t.checklist.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })),
      dependsOn: t.dependsOn.map((d) => d.dependsOn)
    }))
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-slate-500">{project.description || "Sin descripción"}</p>
          <p className="mt-1 text-xs text-slate-400">
            Miembros: {project.members.map((m) => m.user.name).join(", ")}
            {" · "}
            Tablero: {project.boardMode === "ADMIN" ? "Administrativo" : "Tareas"}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <EditProjectForm
              projectId={project.id}
              initialName={project.name}
              initialDescription={project.description || ""}
            />
            <ProjectMembersList
              projectId={project.id}
              ownerId={project.ownerId}
              currentUserId={user.userId}
              members={project.members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }))}
            />
            <AddMemberForm
              projectId={project.id}
              existingMemberIds={project.members.map((m) => m.userId)}
            />
          </div>
        )}
      </div>

      <ProjectTabs project={serialized} currentUserId={user.userId} />
    </div>
  );
}
