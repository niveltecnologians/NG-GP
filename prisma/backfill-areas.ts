import { PrismaClient, TaskArea } from "@prisma/client";

const prisma = new PrismaClient();

// Nombre y color con el que se crea (una sola vez) el área nueva que
// corresponde a cada valor del sistema antiguo de 4 áreas fijas, para que
// los usuarios/tareas/invitaciones que tenían ese valor queden apuntando a
// un área real y editable. Los colores son los mismos que tenían esas 4
// áreas antes, para no cambiarle la apariencia a nadie.
const LEGACY_AREA_INFO: Record<TaskArea, { name: string; colorKey: string }> = {
  CARPINTERIA: { name: "Carpintería", colorKey: "yellow" },
  REDES: { name: "Redes", colorKey: "red" },
  ARQUITECTURA: { name: "Arquitectura", colorKey: "blue" },
  OBRA_CIVIL: { name: "Obra Civil", colorKey: "green" }
};

// Traspasa el área antigua (enum fijo, guardada ahora en legacyArea) a la
// tabla nueva Area (editable desde el panel de administración). Se corre
// solo automáticamente en cada build; es seguro ejecutarlo varias veces:
// si un usuario/tarea/invitación ya tiene areaId asignado, no se toca (así
// no se pisa un cambio de área ya hecho a mano después de la migración).
async function main() {
  const legacyValues = Object.keys(LEGACY_AREA_INFO) as TaskArea[];

  let migrated = 0;

  for (const legacy of legacyValues) {
    const info = LEGACY_AREA_INFO[legacy];

    const [usersPending, tasksPending, invitesPending] = await Promise.all([
      prisma.user.count({ where: { legacyArea: legacy, areaId: null } }),
      prisma.task.count({ where: { legacyArea: legacy, areaId: null } }),
      prisma.inviteCode.count({ where: { legacyArea: legacy, areaId: null } })
    ]);

    if (usersPending === 0 && tasksPending === 0 && invitesPending === 0) continue;

    // Se crea (o se reutiliza si ya existe con ese nombre) el área nueva
    // correspondiente, y recién ahí se traspasan los registros pendientes.
    const area = await prisma.area.upsert({
      where: { name: info.name },
      update: {},
      create: { name: info.name, colorKey: info.colorKey }
    });

    const [u, t, i] = await Promise.all([
      prisma.user.updateMany({ where: { legacyArea: legacy, areaId: null }, data: { areaId: area.id } }),
      prisma.task.updateMany({ where: { legacyArea: legacy, areaId: null }, data: { areaId: area.id } }),
      prisma.inviteCode.updateMany({ where: { legacyArea: legacy, areaId: null }, data: { areaId: area.id } })
    ]);

    migrated += u.count + t.count + i.count;
  }

  if (migrated === 0) {
    console.log("Traspaso de áreas: nada pendiente.");
  } else {
    console.log(`Traspaso de áreas: ${migrated} registro(s) migrado(s) al nuevo sistema de áreas.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

