import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ATTACHMENT_LIST_SELECT } from "@/lib/selects";
import { notifyTaskAssignment } from "@/lib/notify";

async function assertAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } } }
  });
  if (!task) return null;
  const isMember =
    task.project.ownerId === userId || task.project.members.some((m) => m.userId === userId);
  return isMember ? task : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertAccess(params.id, user.userId);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const full = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      attachments: { select: ATTACHMENT_LIST_SELECT }
    }
  });
  return NextResponse.json(full);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertAccess(params.id, user.userId);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) data.status = body.status;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const updated = await prisma.task.update({
    where: { id: params.id },
    data,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      attachments: { select: ATTACHMENT_LIST_SELECT }
    }
  });

  const assigneeChanged = body.assigneeId !== undefined && updated.assigneeId !== task.assigneeId;
  if (assigneeChanged && updated.assigneeId) {
    await notifyTaskAssignment({
      assigneeId: updated.assigneeId,
      actorId: user.userId,
      actorName: user.name,
      taskTitle: updated.title,
      projectName: task.project.name
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertAccess(params.id, user.userId);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
