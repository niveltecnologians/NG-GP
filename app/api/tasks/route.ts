import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ATTACHMENT_LIST_SELECT } from "@/lib/selects";
import { notifyTaskAssignment } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { title, description, projectId, assigneeId, priority, dueDate } = await req.json();
  if (!title || !projectId) {
    return NextResponse.json({ error: "Título y proyecto son obligatorios" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { members: true } });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const isMember = project.ownerId === user.userId || project.members.some((m) => m.userId === user.userId);
  if (!isMember) return NextResponse.json({ error: "No perteneces a este proyecto" }, { status: 403 });

  const task = await prisma.task.create({
    data: {
      title,
      description,
      projectId,
      assigneeId: assigneeId || null,
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      createdById: user.userId
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      attachments: { select: ATTACHMENT_LIST_SELECT }
    }
  });

  if (task.assigneeId) {
    await notifyTaskAssignment({
      assigneeId: task.assigneeId,
      actorId: user.userId,
      actorName: user.name,
      taskTitle: task.title,
      projectName: project.name
    });
  }

  return NextResponse.json(task, { status: 201 });
}
