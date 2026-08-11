import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TASK_COMMENT_SELECT } from "@/lib/selects";
import { assertTaskAccess } from "@/lib/taskAccess";

// Lista las observaciones de una tarea, de la más vieja a la más nueva (como
// un historial). Solo puede verlas quien tiene acceso a la tarea (el dueño
// del proyecto, un administrador, o la persona a la que está asignada).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertTaskAccess(params.id, user.userId, user.role);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const comments = await prisma.taskComment.findMany({
    where: { taskId: params.id },
    select: TASK_COMMENT_SELECT,
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json(comments);
}

// Agrega una observación nueva. Quedan como un registro histórico: no se
// pueden editar ni borrar, para que el historial sea confiable.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertTaskAccess(params.id, user.userId, user.role);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const { content } = await req.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "La observación no puede estar vacía" }, { status: 400 });
  }

  const created = await prisma.taskComment.create({
    data: { content: content.trim(), taskId: params.id, authorId: user.userId },
    select: TASK_COMMENT_SELECT
  });

  return NextResponse.json(created, { status: 201 });
}
