export type UserLite = { id: string; name: string; email: string };

export type Attachment = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
};

export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "REVIEW"
  | "DONE"
  | "PROSPECTOS"
  | "DISENO"
  | "PRESUPUESTO"
  | "EJECUCION"
  | "LIQUIDACION"
  | "POSVENTA";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// Modo de tablero de un proyecto: define qué columnas de estado tiene.
// Se elige al crear el proyecto y no se puede cambiar después.
export type BoardMode = "TASKS" | "ADMIN";

export const BOARD_MODE_LABELS: Record<BoardMode, string> = {
  TASKS: "Tareas (Por hacer / En progreso / En revisión / Terminado)",
  ADMIN: "Administrativo (Prospectos / Diseño / Presupuesto / Ejecución / Liquidación / Pos venta)"
};

export const BOARD_MODE_COLUMNS: Record<BoardMode, TaskStatus[]> = {
  TASKS: ["TODO", "IN_PROGRESS", "REVIEW", "DONE"],
  ADMIN: ["PROSPECTOS", "DISENO", "PRESUPUESTO", "EJECUCION", "LIQUIDACION", "POSVENTA"]
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: string;
  assignee: UserLite | null;
  createdBy: UserLite | null;
  attachments: Attachment[];
};

export type ProjectMember = { user: UserLite };

export type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  boardMode: BoardMode;
  ownerId: string;
  owner: UserLite;
  members: ProjectMember[];
  tasks: Task[];
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  REVIEW: "En revisión",
  DONE: "Terminado",
  PROSPECTOS: "Prospectos",
  DISENO: "Diseño",
  PRESUPUESTO: "Presupuesto",
  EJECUCION: "Ejecución",
  LIQUIDACION: "Liquidación",
  POSVENTA: "Pos venta"
};

export const STATUS_DOT: Record<TaskStatus, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  REVIEW: "bg-amber-500",
  DONE: "bg-emerald-500",
  PROSPECTOS: "bg-slate-400",
  DISENO: "bg-purple-500",
  PRESUPUESTO: "bg-blue-500",
  EJECUCION: "bg-amber-500",
  LIQUIDACION: "bg-orange-500",
  POSVENTA: "bg-emerald-500"
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente"
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700"
};
