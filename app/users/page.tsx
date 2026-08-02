import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import UsersManager from "./UsersManager";
import InvitesManager from "./InvitesManager";

export default async function UsersPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    return (
      <div className="card p-10 text-center text-slate-500">
        Solo un administrador puede gestionar usuarios.
      </div>
    );
  }

  const rows = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });
  const users = rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-slate-500">Crea y elimina cuentas del equipo</p>
      </div>
      <UsersManager initialUsers={users} currentUserId={user.userId} />

      <div className="mt-10">
        <InvitesManager />
      </div>
    </div>
  );
}
