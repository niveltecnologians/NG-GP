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

// Datos del usuario que hacen falta para filtrar qué tareas puede ver
// dentro de un proyecto del que es miembro (ver visibleProjectTasks).
export type TaskVisibilityUser = {
  userId: string;
  role: "ADMIN" | "MEMBER" | "CONTABILIDAD" | "GERENTE";
  areaId: string | null;
  seesAllAreas: boolean;
};

// Filtra las tareas de un proyecto según lo que el usuario puede ver: si
// puede administrar el proyecto completo (dueño, administrador o
// gerente) o tiene activado "ve todas las áreas", ve todas las tareas sin
// filtrar. Si no, ve solo las de su propia área de trabajo; si ni el
// usuario ni la tarea tienen un área asignada, cae de vuelta a mostrarle
// solo las que tiene asignadas a él mismo (como antes de que existieran
// las áreas). El chequeo de "asignada a él" se recibe como función porque
// cada página trae los assignees con una forma distinta según su select.
export function visibleProjectTasks<T extends { areaId: string | null }>(
  tasks: T[],
  project: { ownerId: string },
  user: TaskVisibilityUser,
  isAssignedToUser: (task: T) => boolean
): T[] {
  if (canManageProjectTasks(project, user.userId, user.role) || user.seesAllAreas) {
    return tasks;
  }
  return tasks.filter((t) =>
    user.areaId && t.areaId ? t.areaId === user.areaId : isAssignedToUser(t)
  );
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
