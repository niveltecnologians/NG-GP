import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { CHECKLIST_ITEM_SELECT } from "@/lib/selects";
import { assertTaskAccess } from "@/lib/taskAccess";

// Agrega un ítem a la lista de chequeo de la tarea. Es independiente de las
// subtareas: solo informativa, marcarla no completa la tarea sola.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertTaskAccess(params.id, user.userId, user.role);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const { text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "El texto del ítem es obligatorio" }, { status: 400 });
  }

  const count = await prisma.checklistItem.count({ where: { taskId: params.id } });
  const created = await prisma.checklistItem.create({
    data: { text: text.trim(), taskId: params.id, order: count },
    select: CHECKLIST_ITEM_SELECT
  });

  return NextResponse.json(created, { status: 201 });
}
