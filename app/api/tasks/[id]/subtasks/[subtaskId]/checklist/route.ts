import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SUBTASK_CHECKLIST_ITEM_SELECT } from "@/lib/selects";

async function assertAccess(taskId: string, subtaskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } } }
  });
  if (!task) return null;
  const isMember = task.project.ownerId === userId || task.project.members.some((m) => m.userId === userId);
  if (!isMember) return null;
  const subtask = await prisma.subTask.findUnique({ where: { id: subtaskId } });
  if (!subtask || subtask.taskId !== taskId) return null;
  return { task, subtask };
}

// Agrega un ítem a la mini lista de chequeo interna de una subtarea (para
// desglosarla en pasos chiquitos). Solo informativa: no completa la
// subtarea ni la tarea sola.
export async function POST(req: NextRequest, { params }: { params: { id: string; subtaskId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const access = await assertAccess(params.id, params.subtaskId, user.userId);
  if (!access) return NextResponse.json({ error: "Subtarea no encontrada" }, { status: 404 });

  const { text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "El texto del ítem es obligatorio" }, { status: 400 });
  }

  const count = await prisma.subtaskChecklistItem.count({ where: { subtaskId: params.subtaskId } });
  const created = await prisma.subtaskChecklistItem.create({
    data: { text: text.trim(), subtaskId: params.subtaskId, order: count },
    select: SUBTASK_CHECKLIST_ITEM_SELECT
  });

  return NextResponse.json(created, { status: 201 });
}
