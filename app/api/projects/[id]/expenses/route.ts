import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Cualquier miembro del proyecto puede ver los gastos; Contabilidad los ve
// de todos los proyectos (para causarlos), aunque no sea miembro. Para
// crearlos o editar sus datos hay que ser dueño del proyecto o
// administrador (es plata real de la obra); Contabilidad no crea ni edita
// el gasto, solo su estado contable y los comentarios (ver
// expenses/[expenseId]/route.ts y expenses/[expenseId]/comments/route.ts).
async function getAccess(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, members: { select: { userId: true } } }
  });
  if (!project) return { canRead: false, canWrite: false };
  const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
  const canWrite = project.ownerId === userId || role === "ADMIN";
  const canRead = isMember || role === "ADMIN" || role === "CONTABILIDAD";
  return { canRead, canWrite };
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { canRead } = await getAccess(params.id, user.userId, user.role);
  if (!canRead) return NextResponse.json({ error: "No tienes acceso a este proyecto" }, { status: 403 });

  const expenses = await prisma.expense.findMany({
    where: { projectId: params.id },
    include: EXPENSE_INCLUDE,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json(expenses.map(serialize));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { canWrite } = await getAccess(params.id, user.userId, user.role);
  if (!canWrite) {
    return NextResponse.json(
      { error: "Solo el dueño del proyecto o un administrador pueden registrar gastos" },
      { status: 403 }
    );
  }

  const { concept, amount, date, type, notes, providerName, invoiceNumber, fileUrl, fileName, fileMimeType } =
    await req.json();

  if (!concept || !String(concept).trim()) {
    return NextResponse.json({ error: "El concepto del gasto es obligatorio" }, { status: 400 });
  }
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "El valor del gasto debe ser mayor a cero" }, { status: 400 });
  }
  if (!providerName || !String(providerName).trim()) {
    return NextResponse.json({ error: "El proveedor es obligatorio" }, { status: 400 });
  }
  const validType = ["FACTURA", "CUENTA_DE_COBRO", "OTRO"].includes(type) ? type : "OTRO";

  const expense = await prisma.expense.create({
    data: {
      projectId: params.id,
      concept: String(concept).trim(),
      amount: parsedAmount,
      date: date ? new Date(date) : new Date(),
      type: validType,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      providerName: String(providerName).trim(),
      invoiceNumber: typeof invoiceNumber === "string" && invoiceNumber.trim() ? invoiceNumber.trim() : null,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileMimeType: fileMimeType || null,
      createdById: user.userId
    },
    include: EXPENSE_INCLUDE
  });

  return NextResponse.json(serialize(expense), { status: 201 });
}
