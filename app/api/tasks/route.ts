import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TASK_FULL_INCLUDE } from "@/lib/selects";
import { notifyTaskAssignment } from "@/lib/notify";
import { computeAutoPriority } from "@/lib/autoPriority";
import type { TaskStatus } from "@/lib/types";

function serializeTask<
  T extends {
    dependsOn: { dependsOn: { id: string; title: string } }[];
    assignees: { user: { id: string; name: string; email: string } }[];
  }
>(task: T) {
  return {
    ...task,
    dependsOn: task.dependsOn.map((d) => d.dependsOn),
    assignees: task.assignees.map((a) => a.user)
  };
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { title, description, projectId, assigneeIds, priority, startDate, dueDate, status, area, phase, budget, dependsOnIds } =
    await req.json();
  if (!title || !projectId) {
    return NextResponse.json({ error: "Título y proyecto son obligatorios" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { members: true } });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const isMember = project.ownerId === user.userId || project.members.some((m) => m.userId === user.userId);
  if (!isMember) return NextResponse.json({ error: "No perteneces a este proyecto" }, { status: 403 });

  // Solo se puede asignar a gente que sí pertenece al proyecto (dueño o
  // miembro); cualquier otro id se ignora.
  const validAssigneeIds: string[] = Array.isArray(assigneeIds)
    ? assigneeIds.filter(
        (id: string) => id === project.ownerId || project.members.some((m) => m.userId === id)
      )
    : [];

  // Si no viene un estado inicial, se usa la primera columna según el modo
  // de tablero del proyecto (Por hacer / Prospectos).
  const initialStatus: TaskStatus = status || (project.boardMode === "ADMIN" ? "PROSPECTOS" : "TODO");

  // La prioridad se calcula sola según cuánto falta para la fecha límite;
  // si no hay fecha, se respeta la que se haya elegido a mano (o Media).
  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  const autoPriority = computeAutoPriority(parsedDueDate, initialStatus);

  // Las dependencias solo pueden apuntar a tareas que ya existen en el
  // mismo proyecto (se ignora cualquier id que no cumpla eso).
  let validDependsOnIds: string[] = [];
  if (Array.isArray(dependsOnIds) && dependsOnIds.length > 0) {
    const candidates = await prisma.task.findMany({
      where: { id: { in: dependsOnIds }, projectId },
      select: { id: true }
    });
    validDependsOnIds = candidates.map((c) => c.id);
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      projectId,
      priority: autoPriority || priority || "MEDIUM",
      area: area || null,
      phase: phase || null,
      budget: budget === "" || budget === null || budget === undefined ? null : Number(budget),
      startDate: startDate ? new Date(startDate) : null,
      dueDate: parsedDueDate,
      createdById: user.userId,
      status: initialStatus,
      dependsOn: {
        create: validDependsOnIds.map((depId) => ({ dependsOnId: depId }))
      },
      assignees: {
        create: validAssigneeIds.map((userId) => ({ userId }))
      }
    },
    include: TASK_FULL_INCLUDE
  });

  for (const assigneeId of validAssigneeIds) {
    await notifyTaskAssignment({
      assigneeId,
      actorId: user.userId,
      actorName: user.name,
      taskTitle: task.title,
      projectName: project.name
    });
  }

  return NextResponse.json(serializeTask(task), { status: 201 });
}
