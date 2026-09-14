import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import AreasManager from "./AreasManager";

export default async function AreasPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    return (
      <div className="card p-10 text-center text-slate-500">
        Solo un administrador puede gestionar las áreas de trabajo.
      </div>
    );
  }

  const rows = await prisma.area.findMany({
    select: {
      id: true,
      name: true,
      colorKey: true,
      _count: { select: { users: true, tasks: true } }
    },
    orderBy: { name: "asc" }
  });
  const areas = rows.map((a) => ({
    id: a.id,
    name: a.name,
    colorKey: a.colorKey,
    usersCount: a._count.users,
    tasksCount: a._count.tasks
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Áreas de trabajo</h1>
        <p className="text-sm text-slate-500">
          Crea, edita o elimina las áreas/oficios de la empresa. Aparecen de inmediato en tareas, usuarios e invitaciones, sin tocar código.
        </p>
      </div>
      <AreasManager initialAreas={areas} />
    </div>
  );
}

