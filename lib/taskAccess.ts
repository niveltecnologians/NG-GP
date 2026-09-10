import { prisma } from "@/lib/prisma";

// Reglas de visibilidad de tareas: el dueño del proyecto, los
// administradores del sistema y los gerentes pueden ver y modificar TODAS
// las tareas del proyecto (el gerente, aunque no sea miembro de ese
// proyecto). Cualquier otro miembro solo puede ver y modificar las tareas
// que tiene asignadas a él mismo (el resto ni siquiera le aparecen).
export function canManageProjectTasks(
  project: { ownerId: string },
  userId: string,
  userRole: "ADMIN" | "MEMBER" | "CONTABILIDAD" | "GERENTE"
) {
  return project.ownerId === userId || userRole === "ADMIN" || userRole === "GERENTE";
}

// Revisa que el usuario pertenezca al proyecto de la tarea (o sea gerente,
// que ve todos los proyectos sin necesidad de ser miembro) y, si no puede
// administrar todo el proyecto, que la tarea esté asignada a él. Devuelve
// la tarea (con su proyecto incluido) si tiene acceso, o null si no.
export async function assertTaskAccess(
  taskId: string,
  userId: string,
  userRole: "ADMIN" | "MEMBER" | "CONTABILIDAD" | "GERENTE"
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } }, assignees: true }
  });
  if (!task) return null;

  const isMember =
    task.project.ownerId === userId ||
    task.project.members.some((m) => m.userId === userId) ||
    userRole === "GERENTE";
  if (!isMember) return null;

  const isAssignee = task.assignees.some((a) => a.userId === userId);
  if (!canManageProjectTasks(task.project, userId, userRole) && !isAssignee) {
    return null;
  }

  return task;
}
