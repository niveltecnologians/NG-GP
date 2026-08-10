export type UserLite = { id: string; name: string; email: string };

export type Attachment = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
};

export type SubTask = {
  id: string;
  title: string;
  done: boolean;
  order: number;
  createdAt: string;
};

export type TaskComment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string } | null;
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
export type TaskArea = "CARPINTERIA" | "REDES" | "ARQUITECTURA";

// Fase del proceso de la actividad (independiente del estado del tablero):
// en qué parte del proceso general de la obra está esa tarea puntual.
export type TaskPhase = "DISENO" | "PRESUPUESTO" | "EJECUCION" | "LIQUIDACION";

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

export type TaskDependencyRef = { id: string; title: string };

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  projectId: string;
  assignee: UserLite | null;
  createdBy: UserLite | null;
  attachments: Attachment[];
  subtasks: SubTask[];
  area: TaskArea | null;
  phase: TaskPhase | null;
  budget: number | null;
  dependsOn: TaskDependencyRef[];
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

// Área/oficio de la tarea: cada una tiene un color fijo, asignado solo por
// elegir el área (no se elige el color a mano).
export const AREA_LABELS: Record<TaskArea, string> = {
  CARPINTERIA: "Carpintería",
  REDES: "Redes",
  ARQUITECTURA: "Arquitectura"
};

export const AREA_BADGE_COLORS: Record<TaskArea, string> = {
  CARPINTERIA: "bg-yellow-100 text-yellow-700",
  REDES: "bg-red-100 text-red-700",
  ARQUITECTURA: "bg-blue-100 text-blue-700"
};

export const AREA_BORDER_COLORS: Record<TaskArea, string> = {
  CARPINTERIA: "border-l-yellow-400",
  REDES: "border-l-red-400",
  ARQUITECTURA: "border-l-blue-400"
};

// Fase de la actividad dentro del proceso general (independiente del
// tablero Kanban): se puede clasificar cualquier tarea de cualquier
// proyecto, sea del modo Tareas o del modo Administrativo.
export const PHASE_LABELS: Record<TaskPhase, string> = {
  DISENO: "Diseño",
  PRESUPUESTO: "Presupuesto",
  EJECUCION: "Ejecución",
  LIQUIDACION: "Liquidación"
};

export const PHASE_BADGE_COLORS: Record<TaskPhase, string> = {
  DISENO: "bg-purple-100 text-purple-700",
  PRESUPUESTO: "bg-sky-100 text-sky-700",
  EJECUCION: "bg-amber-100 text-amber-700",
  LIQUIDACION: "bg-orange-100 text-orange-700"
};

export const PHASE_BAR_COLORS: Record<TaskPhase, string> = {
  DISENO: "bg-purple-400",
  PRESUPUESTO: "bg-sky-400",
  EJECUCION: "bg-amber-400",
  LIQUIDACION: "bg-orange-400"
};

// Tarea con el nombre y modo del proyecto al que pertenece, para la vista
// global que junta tareas de todos los proyectos.
export type GlobalTask = Task & {
  projectName: string;
  projectBoardMode: BoardMode;
};
