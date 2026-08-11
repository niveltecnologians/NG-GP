import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SUBTASK_CHECKLIST_ITEM_SELECT } from "@/lib/selects";
import { assertTaskAccess } from "@/lib/taskAccess";

async function assertAccess(taskId: string, subtaskId: string, userId: string, userRole: "ADMIN" | "MEMBER") {
  const task = await assertTaskAccess(taskId, userId, userRole);
  if (!task) return null;
  const subtask = await prisma.subTask.findUnique({ where: { id: subtaskId } });
  if (!subtask || subtask.taskId !== taskId) return null;
  return { task, subtask };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; subtaskId: string; itemId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const access = await assertAccess(params.id, params.subtaskId, user.userId, user.role);
  if (!access) return NextResponse.json({ error: "Subtarea no encontrada" }, { status: 404 });

  const item = await prisma.subtaskChecklistItem.findUnique({ where: { id: params.itemId } });
  if (!item || item.subtaskId !== params.subtaskId) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.text !== undefined) data.text = body.text;
  if (body.done !== undefined) data.done = Boolean(body.done);

  const updated = await prisma.subtaskChecklistItem.update({
    where: { id: params.itemId },
    data,
    select: SUBTASK_CHECKLIST_ITEM_SELECT
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; subtaskId: string; itemId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const access = await assertAccess(params.id, params.subtaskId, user.userId, user.role);
  if (!access) return NextResponse.json({ error: "Subtarea no encontrada" }, { status: 404 });

  const item = await prisma.subtaskChecklistItem.findUnique({ where: { id: params.itemId } });
  if (!item || item.subtaskId !== params.subtaskId) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  await prisma.subtaskChecklistItem.delete({ where: { id: params.itemId } });
  return NextResponse.json({ ok: true });
}
