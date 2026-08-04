import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import KanbanBoard from "@/components/KanbanBoard";
import AddMemberForm from "./AddMemberForm";
import EditProjectForm from "./EditProjectForm";
import ProjectMembersList from "./ProjectMembersList";
import { ATTACHMENT_LIST_SELECT } from "@/lib/selects";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const user = await requireUser();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          attachments: { select: ATTACHMENT_LIST_SELECT }
        },
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
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      attachments: t.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))
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

      <KanbanBoard project={serialized} currentUserId={user.userId} />
    </div>
  );
}
