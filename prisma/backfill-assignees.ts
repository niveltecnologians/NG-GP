import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Traspasa el "asignado a" antiguo (una sola persona por tarea, guardado en
// Task.assigneeId) a la tabla nueva que permite varias personas asignadas
// (TaskAssignee). Se corre solo automáticamente en cada build; es seguro
// ejecutarlo varias veces: si una tarea ya tiene a alguien en la lista
// nueva, no se toca (para no pisar cambios ya hechos con la nueva función).
async function main() {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: { not: null } },
    select: { id: true, assigneeId: true, assignees: { select: { id: true } } }
  });

  const toCreate = tasks.filter((t) => t.assignees.length === 0 && t.assigneeId);

  if (toCreate.length === 0) {
    console.log("Traspaso de asignados: nada pendiente.");
    return;
  }

  await prisma.taskAssignee.createMany({
    data: toCreate.map((t) => ({ taskId: t.id, userId: t.assigneeId as string })),
    skipDuplicates: true
  });

  console.log(`Traspaso de asignados: ${toCreate.length} tarea(s) migrada(s) al nuevo formato.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
