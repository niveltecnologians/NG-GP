import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import NewProjectForm from "./NewProjectForm";

export default async function DashboardPage() {
  const user = await requireUser();

  const projects = await prisma.project.findMany({
    where: { OR: [{ ownerId: user.userId }, { members: { some: { userId: user.userId } } }] },
    include: { _count: { select: { tasks: true } }, members: true, owner: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis proyectos</h1>
          <p className="text-sm text-slate-500">Tableros de seguimiento y trazabilidad de tareas</p>
        </div>
        <NewProjectForm />
      </div>

      {projects.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Aún no tienes proyectos. Crea el primero para empezar a asignar tareas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="card p-5 hover:border-brand-400 hover:shadow-md transition">
              <h2 className="font-semibold text-slate-900">{p.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description || "Sin descripción"}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>{p._count.tasks} tareas</span>
                <span>{p.members.length} miembros</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">Dueño: {p.owner.name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
