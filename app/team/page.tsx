import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import TeamManager from "./TeamManager";

// "Mi equipo": colaboradores propios sin acceso al sistema (solo nombre y
// cargo, ej. "Óscar Sánchez, Oficial") que cualquier usuario puede armar
// para poder asignarles tareas junto con los demás usuarios del proyecto,
// y verlos aparte en el calendario de obras.

export default async function TeamPage() {
  const user = await requireUser();

  const rows = await prisma.teamMember.findMany({
    where: { ownerId: user.userId },
    orderBy: { createdAt: "asc" }
  });
  const teamMembers = rows.map((tm) => ({ ...tm, createdAt: tm.createdAt.toISOString() }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mi equipo</h1>
        <p className="text-sm text-slate-500">
          Arma tu equipo de trabajo (oficiales, ayudantes u otros colaboradores que no necesitan entrar
          al sistema) para poder asignarles tareas y verlos en el calendario de obras.
        </p>
      </div>
      <TeamManager initialTeamMembers={teamMembers} />
    </div>
  );
}

