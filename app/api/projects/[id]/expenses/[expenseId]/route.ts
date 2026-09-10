import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function loadExpense(projectId: string, expenseId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { id: true, projectId: true, fileUrl: true, project: { select: { ownerId: true } } }
  });
  if (!expense || expense.projectId !== projectId) return null;
  return expense;
}

const EXPENSE_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  comments: {
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" as const }
  }
} as const;

function serialize(expense: {
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  comments?: { createdAt: Date; [key: string]: unknown }[];
  [key: string]: unknown;
}) {
  return {
    ...expense,
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    comments: (expense.comments || []).map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))
  };
}

// Un gasto tiene dos "dueños" de permisos distintos: el dueño del proyecto
// (o un administrador) edita los datos del gasto en sí (concepto, valor,
// proveedor, comprobante, etc.); Contabilidad (o un administrador) solo
// cambia el estado contable (causado/no causado/pendiente). Cada uno puede
// mandar solo lo que le corresponde; lo demás se ignora en silencio.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const expense = await loadExpense(params.id, params.expenseId);
  if (!expense) return NextResponse.json({ error: "No se encontró el gasto" }, { status: 404 });

  const isOwnerOrAdmin = expense.project.ownerId === user.userId || user.role === "ADMIN";
  const isAccounting = user.role === "CONTABILIDAD" || user.role === "ADMIN";
  if (!isOwnerOrAdmin && !isAccounting) {
    return NextResponse.json({ error: "No tienes acceso a este gasto" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (isOwnerOrAdmin) {
    const { concept, amount, date, type, notes, providerName, invoiceNumber, fileUrl, fileName, fileMimeType } = body;

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
    if (providerName !== undefined) {
      if (!String(providerName).trim()) {
        return NextResponse.json({ error: "El proveedor es obligatorio" }, { status: 400 });
      }
      data.providerName = String(providerName).trim();
    }
    if (invoiceNumber !== undefined) {
      data.invoiceNumber = typeof invoiceNumber === "string" && invoiceNumber.trim() ? invoiceNumber.trim() : null;
    }

    // Reemplazar el comprobante: si había uno viejo en Blob, se borra.
    if (fileUrl !== undefined) {
      if (expense.fileUrl && expense.fileUrl !== fileUrl) {
        await del(expense.fileUrl).catch(() => {});
      }
      data.fileUrl = fileUrl || null;
      data.fileName = fileName || null;
      data.fileMimeType = fileMimeType || null;
    }
  }

  if (isAccounting && body.accountingStatus !== undefined) {
    if (!["PENDIENTE", "CAUSADO", "NO_CAUSADO"].includes(body.accountingStatus)) {
      return NextResponse.json({ error: "Estado contable inválido" }, { status: 400 });
    }
    data.accountingStatus = body.accountingStatus;
  }

  const updated = await prisma.expense.update({
    where: { id: params.expenseId },
    data,
    include: EXPENSE_INCLUDE
  });

  return NextResponse.json(serialize(updated));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const expense = await loadExpense(params.id, params.expenseId);
  if (!expense) return NextResponse.json({ error: "No se encontró el gasto" }, { status: 404 });

  const isOwnerOrAdmin = expense.project.ownerId === user.userId || user.role === "ADMIN";
  if (!isOwnerOrAdmin) {
    return NextResponse.json({ error: "No tienes acceso a este gasto" }, { status: 403 });
  }

  if (expense.fileUrl) {
    await del(expense.fileUrl).catch(() => {
      // si ya no existe en Blob, no pasa nada: igual borramos el registro.
    });
  }

  await prisma.expense.delete({ where: { id: params.expenseId } });
  return NextResponse.json({ ok: true });
}
