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

export const SUBTASK_LIST_SELECT = {
  id: true,
  title: true,
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

export const TASK_FULL_INCLUDE = {
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  attachments: { select: ATTACHMENT_LIST_SELECT },
  subtasks: { select: SUBTASK_LIST_SELECT, orderBy: { order: "asc" as const } },
  dependsOn: { select: { dependsOn: { select: { id: true, title: true } } } }
} as const;
