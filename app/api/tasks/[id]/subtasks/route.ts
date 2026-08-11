import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SUBTASK_LIST_SELECT } from "@/lib/selects";
import { assertTaskAccess } from "@/lib/taskAccess";

// Crea una subtarea (un ítem del checklist) dentro de una tarea.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertTaskAccess(params.id, user.userId, user.role);
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
