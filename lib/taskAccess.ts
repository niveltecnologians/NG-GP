import { prisma } from "@/lib/prisma";

// Reglas de visibilidad de tareas: el dueño del proyecto y los
// administradores del sistema pueden ver y modificar TODAS las tareas del
// proyecto. Cualquier otro miembro solo puede ver y modificar las tareas que
// tiene asignadas a él mismo (el resto ni siquiera le aparecen).
export function canManageProjectTasks(
  project: { ownerId: string },
  userId: string,
  userRole: "ADMIN" | "MEMBER"
) {
  return project.ownerId === userId || userRole === "ADMIN";
}

// Revisa que el usuario pertenezca al proyecto de la tarea y, si no puede
// administrar todo el proyecto, que la tarea esté asignada a él. Devuelve la
// tarea (con su proyecto incluido) si tiene acceso, o null si no.
export async function assertTaskAccess(taskId: string, userId: string, userRole: "ADMIN" | "MEMBER") {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } } }
  });
  if (!task) return null;

  const isMember = task.project.ownerId === userId || task.project.members.some((m) => m.userId === userId);
  if (!isMember) return null;

  if (!canManageProjectTasks(task.project, userId, userRole) && task.assigneeId !== userId) {
    return null;
  }

  return task;
}
