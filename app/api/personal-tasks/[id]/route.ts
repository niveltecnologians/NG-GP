import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Marca/desmarca como hecha, edita el título, o elimina una tarea externa
// puntual. Solo el dueño de esa tarea (quien la creó) puede tocarla.

async function assertOwnTask(id: string, userId: string) {
  const task = await prisma.personalTask.findUnique({ where: { id } });
  if (!task || task.userId !== userId) return null;
  return task;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const existing = await assertOwnTask(params.id, user.userId);
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const { title, done } = await req.json();
  const data: { title?: string; done?: boolean } = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof done === "boolean") data.done = done;

  const task = await prisma.personalTask.update({ where: { id: params.id }, data });
  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const existing = await assertOwnTask(params.id, user.userId);
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.personalTask.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
