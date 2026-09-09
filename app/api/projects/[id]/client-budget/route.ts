import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function assertCanManage(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, members: { select: { userId: true } } }
  });
  if (!project) return null;
  const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
  const canWrite = project.ownerId === userId || role === "ADMIN";
  return { canRead: isMember || role === "ADMIN", canWrite };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const access = await assertCanManage(params.id, user.userId, user.role);
  if (!access?.canRead) return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });

  const items = await prisma.clientBudgetItem.findMany({
    where: { projectId: params.id },
    orderBy: { order: "asc" }
  });
  return NextResponse.json(items);
}

// Se guarda el presupuesto completo de una sola vez (se borra lo que había y
// se escribe lo nuevo). Es más simple que ir fila por fila, y como el
// presupuesto siempre se edita como una tabla entera, funciona bien.
// Si se manda una lista vacía, el proyecto queda sin presupuesto asignado y
// el portal del cliente simplemente no muestra esa pestaña.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const access = await assertCanManage(params.id, user.userId, user.role);
  if (!access?.canWrite) {
    return NextResponse.json({ error: "Solo el dueño del proyecto puede editar el presupuesto" }, { status: 403 });
  }

  const payload = await req.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];

  const clean = items
    .filter((i: any) => i?.concept && String(i.concept).trim())
    .map((i: any, index: number) => ({
      projectId: params.id,
      concept: String(i.concept).trim(),
      amount: Number(i.amount) || 0,
      executed: Number(i.executed) || 0,
      order: index
    }));

  await prisma.$transaction([
    prisma.clientBudgetItem.deleteMany({ where: { projectId: params.id } }),
    ...(clean.length > 0 ? [prisma.clientBudgetItem.createMany({ data: clean })] : [])
  ]);

  const saved = await prisma.clientBudgetItem.findMany({
    where: { projectId: params.id },
    orderBy: { order: "asc" }
  });
  return NextResponse.json(saved);
}
