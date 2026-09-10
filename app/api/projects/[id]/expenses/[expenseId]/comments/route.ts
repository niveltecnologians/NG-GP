import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Los comentarios de un gasto son la "ida y vuelta" entre Contabilidad y el
// encargado de la obra (ej: "falta el número de factura" / "ya la subo").
// Puede escribir cualquiera que pueda ver el gasto: miembros del proyecto,
// administradores, y Contabilidad (aunque no sea miembro del proyecto).
async function canAccessExpense(projectId: string, expenseId: string, userId: string, role: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: {
      id: true,
      projectId: true,
      project: { select: { ownerId: true, members: { select: { userId: true } } } }
    }
  });
  if (!expense || expense.projectId !== projectId) return false;

  const isMember =
    expense.project.ownerId === userId || expense.project.members.some((m) => m.userId === userId);
  return isMember || role === "ADMIN" || role === "CONTABILIDAD";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const ok = await canAccessExpense(params.id, params.expenseId, user.userId, user.role);
  if (!ok) return NextResponse.json({ error: "No tienes acceso a este gasto" }, { status: 403 });

  const comments = await prisma.expenseComment.findMany({
    where: { expenseId: params.expenseId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json(comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const ok = await canAccessExpense(params.id, params.expenseId, user.userId, user.role);
  if (!ok) return NextResponse.json({ error: "No tienes acceso a este gasto" }, { status: 403 });

  const { content } = await req.json();
  if (!content || !String(content).trim()) {
    return NextResponse.json({ error: "Escribe algo antes de enviar" }, { status: 400 });
  }

  const comment = await prisma.expenseComment.create({
    data: {
      expenseId: params.expenseId,
      content: String(content).trim(),
      authorId: user.userId
    },
    include: { author: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ ...comment, createdAt: comment.createdAt.toISOString() }, { status: 201 });
}

