import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SUBTASK_LIST_SELECT } from "@/lib/selects";

async function assertAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } } }
  });
  if (!task) return null;
  const isMember = task.project.ownerId === userId || task.project.members.some((m) => m.userId === userId);
  return isMember ? task : null;
}

// Crea una subtarea (un ítem del checklist) dentro de una tarea.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertAccess(params.id, user.userId);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const { title } = await req.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "El título de la subtarea es obligatorio" }, { status: 400 });
  }

  const count = await prisma.subTask.count({ where: { taskId: params.id } });
  const created = await prisma.subTask.create({
    data: { title: title.trim(), taskId: params.id, order: count },
    select: SUBTASK_LIST_SELECT
  });

  return NextResponse.json(created, { status: 201 });
}
