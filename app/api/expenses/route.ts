import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Vista global para Contabilidad: todos los gastos de todos los proyectos,
// para poder causarlos sin tener que entrar proyecto por proyecto. Solo
// Contabilidad y los administradores pueden verla.
const EXPENSE_INCLUDE = {
  project: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  comments: {
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" as const }
  }
} as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "CONTABILIDAD") {
    return NextResponse.json({ error: "Solo Contabilidad puede ver esta lista" }, { status: 403 });
  }

  const expenses = await prisma.expense.findMany({
    include: EXPENSE_INCLUDE,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json(
    expenses.map((e) => ({
      ...e,
      date: e.date.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      comments: e.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))
    }))
  );
}

