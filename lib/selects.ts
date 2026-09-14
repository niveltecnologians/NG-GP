// Selects reutilizables de Prisma. Excluyen a propósito el campo `data`
// (bytes) de los adjuntos: ese campo solo debe leerse en la ruta de
// descarga de un archivo puntual, nunca en listados, para no inflar
// las respuestas JSON con el contenido binario de cada archivo.
export const ATTACHMENT_LIST_SELECT = {
  id: true,
  filename: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } }
} as const;

export const SUBTASK_CHECKLIST_ITEM_SELECT = {
  id: true,
  text: true,
  done: true,
  order: true,
  createdAt: true
} as const;

export const SUBTASK_LIST_SELECT = {
  id: true,
  title: true,
  done: true,
  order: true,
  createdAt: true,
  checklist: { select: SUBTASK_CHECKLIST_ITEM_SELECT, orderBy: { order: "asc" as const } }
} as const;

// Lista de chequeo de la tarea, independiente de las subtareas.
export const CHECKLIST_ITEM_SELECT = {
  id: true,
  text: true,
  done: true,
  order: true,
  createdAt: true
} as const;

export const TASK_COMMENT_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  author: { select: { id: true, name: true } }
} as const;

// Tareas de las que depende esta (no puede empezar hasta que terminen),
// para el diagrama de Gantt / ruta crítica.
export const TASK_DEPENDS_ON_SELECT = {
  dependsOn: { select: { id: true, title: true } }
} as const;

// Personas asignadas a la tarea (puede ser más de una). Se selecciona la
// fila de TaskAssignee con el usuario adentro; las rutas la "aplanan" a una
// lista simple de personas antes de mandarla al navegador.
export const TASK_ASSIGNEES_SELECT = {
  user: { select: { id: true, name: true, email: true } }
} as const;

// Miembros del equipo de trabajo (sin acceso al sistema) asignados a la
// tarea. Igual que TASK_ASSIGNEES_SELECT pero para TaskTeamMember: se
// selecciona la fila con el miembro del equipo adentro.
export const TASK_TEAM_ASSIGNEES_SELECT = {
  teamMember: { select: { id: true, name: true, title: true, ownerId: true } }
} as const;

// Área de trabajo de la tarea: se trae como relación (id, nombre y color)
// en vez del enum viejo, para que cualquier área que se cree quede
// disponible de inmediato sin tocar código.
export const AREA_LITE_SELECT = {
  id: true,
  name: true,
  colorKey: true
} as const;

export const TASK_FULL_INCLUDE = {
  area: { select: AREA_LITE_SELECT },
  assignees: { select: TASK_ASSIGNEES_SELECT, orderBy: { createdAt: "asc" as const } },
  teamAssignees: { select: TASK_TEAM_ASSIGNEES_SELECT, orderBy: { createdAt: "asc" as const } },
  createdBy: { select: { id: true, name: true, email: true } },
  attachments: { select: ATTACHMENT_LIST_SELECT },
  subtasks: { select: SUBTASK_LIST_SELECT, orderBy: { order: "asc" as const } },
  checklist: { select: CHECKLIST_ITEM_SELECT, orderBy: { order: "asc" as const } },
  dependsOn: { select: { dependsOn: { select: { id: true, title: true } } } }
} as const;
