import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { CHECKLIST_ITEM_SELECT } from "@/lib/selects";
import { assertTaskAccess } from "@/lib/taskAccess";

// Marca/desmarca un ítem de la lista de chequeo de la tarea, o le cambia el
// texto. No dispara ningún efecto sobre la tarea (a diferencia de las
// subtareas): es solo un registro informativo.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertTaskAccess(params.id, user.userId, user.role);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const item = await prisma.checklistItem.findUnique({ where: { id: params.itemId } });
  if (!item || item.taskId !== params.id) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.text !== undefined) data.text = body.text;
  if (body.done !== undefined) data.done = Boolean(body.done);

  const updated = await prisma.checklistItem.update({
    where: { id: params.itemId },
    data,
    select: CHECKLIST_ITEM_SELECT
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertTaskAccess(params.id, user.userId, user.role);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const item = await prisma.checklistItem.findUnique({ where: { id: params.itemId } });
  if (!item || item.taskId !== params.id) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  await prisma.checklistItem.delete({ where: { id: params.itemId } });
  return NextResponse.json({ ok: true });
}
