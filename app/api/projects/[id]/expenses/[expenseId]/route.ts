import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function assertCanWrite(projectId: string, expenseId: string, userId: string, role: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { id: true, projectId: true, fileUrl: true, project: { select: { ownerId: true } } }
  });
  if (!expense || expense.projectId !== projectId) return null;
  if (expense.project.ownerId !== userId && role !== "ADMIN") return null;
  return expense;
}

const EXPENSE_INCLUDE = {
  createdBy: { select: { id: true, name: true } }
} as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const expense = await assertCanWrite(params.id, params.expenseId, user.userId, user.role);
  if (!expense) return NextResponse.json({ error: "No tienes acceso a este gasto" }, { status: 403 });

  const { concept, amount, date, type, notes, fileUrl, fileName, fileMimeType } = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof concept === "string" && concept.trim()) data.concept = concept.trim();
  if (amount !== undefined) {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "El valor del gasto debe ser mayor a cero" }, { status: 400 });
    }
    data.amount = parsedAmount;
  }
  if (date) data.date = new Date(date);
  if (["FACTURA", "CUENTA_DE_COBRO", "OTRO"].includes(type)) data.type = type;
  if (notes !== undefined) data.notes = typeof notes === "string" && notes.trim() ? notes.trim() : null;

  // Reemplazar el comprobante: si había uno viejo en Blob, se borra.
  if (fileUrl !== undefined) {
    if (expense.fileUrl && expense.fileUrl !== fileUrl) {
      await del(expense.fileUrl).catch(() => {});
    }
    data.fileUrl = fileUrl || null;
    data.fileName = fileName || null;
    data.fileMimeType = fileMimeType || null;
  }

  const updated = await prisma.expense.update({
    where: { id: params.expenseId },
    data,
    include: EXPENSE_INCLUDE
  });

  return NextResponse.json({
    ...updated,
    date: updated.date.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString()
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const expense = await assertCanWrite(params.id, params.expenseId, user.userId, user.role);
  if (!expense) return NextResponse.json({ error: "No tienes acceso a este gasto" }, { status: 403 });

  if (expense.fileUrl) {
    await del(expense.fileUrl).catch(() => {
      // si ya no existe en Blob, no pasa nada: igual borramos el registro.
    });
  }

  await prisma.expense.delete({ where: { id: params.expenseId } });
  return NextResponse.json({ ok: true });
}

