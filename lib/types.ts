export type UserLite = { id: string; name: string; email: string };

export type Attachment = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
};

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

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
  ownerId: string;
  owner: UserLite;
  members: ProjectMember[];
  tasks: Task[];
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  REVIEW: "En revisión",
  DONE: "Terminado"
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
