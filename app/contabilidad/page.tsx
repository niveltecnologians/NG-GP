import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import AccountingView from "@/components/AccountingView";

// Vista global de Contabilidad: todos los gastos de todos los proyectos,
// para poder marcarlos como causados/no causados y comentarles al
// encargado de cada obra, sin entrar a los tableros ni tareas.
const EXPENSE_INCLUDE = {
  project: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  comments: {
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" as const }
  }
} as const;

export default async function ContabilidadPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN" && user.role !== "CONTABILIDAD") {
    return (
      <div className="card p-10 text-center text-slate-500">
        Solo Contabilidad puede ver esta sección.
      </div>
    );
  }

  const rows = await prisma.expense.findMany({
    include: EXPENSE_INCLUDE,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  const expenses = rows.map((e) => ({
    ...e,
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    comments: e.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Contabilidad</h1>
        <p className="text-sm text-slate-500">
          Gastos de todas las obras: marca cada uno como causado, no causado o pendiente, y
          coméntale al encargado de la obra si falta algo.
        </p>
      </div>
      <AccountingView initialExpenses={expenses} />
    </div>
  );
}

