export type UserLite = { id: string; name: string; email: string };

// Miembro del equipo de trabajo (sin acceso al sistema) de quien creó o
// edita la tarea: solo nombre y cargo.
export type TeamMemberLite = { id: string; name: string; title: string | null };

// Paleta fija de colores que puede tener un área (ver AreaLite más abajo).
// Es fija porque Tailwind necesita ver el nombre completo de cada clase
// escrito literalmente en el código para poder generarla; no se puede
// armar un nombre de clase a partir de un color guardado en la base de
// datos. Un área nueva elige uno de estos colores, no cualquiera.
//
// NOTA: colorKey se guarda como texto libre en la columna de la base de
// datos (no es un enum de Prisma), así que este tipo es "string" para que
// cualquier valor que venga de una consulta a la base de datos encaje sin
// fricción con AreaLite. La lista real de colores válidos para elegir al
// crear/editar un área es AREA_COLOR_KEYS, justo abajo.
export type AreaColorKey = string;

export const AREA_COLOR_KEYS: AreaColorKey[] = [
  "yellow",
  "red",
  "blue",
  "green",
  "purple",
  "orange",
  "pink",
  "teal",
  "cyan",
  "slate"
];

export const DEFAULT_AREA_COLOR_KEY: AreaColorKey = "slate";

// Área/oficio de trabajo. Ahora es editable desde el panel de
// administración (Áreas de trabajo) en vez de una lista fija en el
// código: cada obra/tarea/usuario se relaciona con una fila real de la
// tabla Area, con nombre libre y un color de la paleta de arriba.
export type AreaLite = { id: string; name: string; colorKey: AreaColorKey };

export type Attachment = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
};

// Ítem de una lista de chequeo (usado tanto para la lista de chequeo de la
// tarea como para la lista de chequeo interna de una subtarea). Siempre es
// solo informativo: marcarlo no completa nada más solo.
export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  order: number;
  createdAt: string;
};

export type SubTask = {
  id: string;
  title: string;
  done: boolean;
  order: number;
  createdAt: string;
  checklist: ChecklistItem[];
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
  assignees: UserLite[];
  teamAssignees: TeamMemberLite[];
  createdBy: UserLite | null;
  attachments: Attachment[];
  subtasks: SubTask[];
  checklist: ChecklistItem[];
  area: AreaLite | null;
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

// Etiqueta en español de cada color de la paleta fija (para el selector de
// color al crear/editar un área).
export const AREA_COLOR_LABELS: Record<AreaColorKey, string> = {
  yellow: "Amarillo",
  red: "Rojo",
  blue: "Azul",
  green: "Verde",
  purple: "Morado",
  orange: "Naranja",
  pink: "Rosado",
  teal: "Verde azulado",
  cyan: "Celeste",
  slate: "Gris"
};

export const AREA_COLOR_BADGE: Record<AreaColorKey, string> = {
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  pink: "bg-pink-100 text-pink-700",
  teal: "bg-teal-100 text-teal-700",
  cyan: "bg-cyan-100 text-cyan-700",
  slate: "bg-slate-100 text-slate-600"
};

export const AREA_COLOR_BORDER: Record<AreaColorKey, string> = {
  yellow: "border-l-yellow-400",
  red: "border-l-red-400",
  blue: "border-l-blue-400",
  green: "border-l-green-400",
  purple: "border-l-purple-400",
  orange: "border-l-orange-400",
  pink: "border-l-pink-400",
  teal: "border-l-teal-400",
  cyan: "border-l-cyan-400",
  slate: "border-l-slate-400"
};

export const AREA_COLOR_DOT: Record<AreaColorKey, string> = {
  yellow: "bg-yellow-400",
  red: "bg-red-400",
  blue: "bg-blue-400",
  green: "bg-green-400",
  purple: "bg-purple-400",
  orange: "bg-orange-400",
  pink: "bg-pink-400",
  teal: "bg-teal-400",
  cyan: "bg-cyan-400",
  slate: "bg-slate-400"
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

// Rol de usuario del sistema. CONTABILIDAD ve los gastos de todos los
// proyectos (para causarlos) pero no entra a los tableros ni tareas.
// GERENTE ve y edita todas las tareas de todas las obras, sin necesidad de
// ser miembro de cada proyecto (igual que ADMIN, pero pensado para quien
// supervisa todas las obras en general, sin las demás funciones de
// administrador como gestionar usuarios).
export type Role = "ADMIN" | "MEMBER" | "CONTABILIDAD" | "GERENTE";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  MEMBER: "Miembro",
  CONTABILIDAD: "Contabilidad",
  GERENTE: "Gerente"
};

// Tipo de comprobante de un gasto.
export type ExpenseType = "FACTURA" | "CUENTA_DE_COBRO" | "OTRO";

// Estado contable de un gasto: lo pone Contabilidad, no quien lo registra.
export type ExpenseAccountingStatus = "PENDIENTE" | "CAUSADO" | "NO_CAUSADO";

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  FACTURA: "Factura electrónica",
  CUENTA_DE_COBRO: "Cuenta de cobro",
  OTRO: "Otro comprobante"
};

export const EXPENSE_ACCOUNTING_STATUS_LABELS: Record<ExpenseAccountingStatus, string> = {
  PENDIENTE: "Pendiente",
  CAUSADO: "Causado",
  NO_CAUSADO: "No causado"
};

export const EXPENSE_ACCOUNTING_STATUS_COLORS: Record<ExpenseAccountingStatus, string> = {
  PENDIENTE: "bg-slate-100 text-slate-600",
  CAUSADO: "bg-emerald-100 text-emerald-700",
  NO_CAUSADO: "bg-red-100 text-red-700"
};

export type ExpenseComment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string } | null;
};
