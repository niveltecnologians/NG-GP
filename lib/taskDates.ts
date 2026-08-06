import type { TaskStatus } from "@/lib/types";

// "DONE" y "POSVENTA" son la última columna de cada modo de tablero
// (Tareas y Administrativo): una tarea ahí ya está realizada.
export function isFinalStatus(status: TaskStatus) {
  return status === "DONE" || status === "POSVENTA";
}

const DUE_SOON_DAYS = 3;

export type DueState = "done" | "overdue" | "soon" | "normal" | "none";

// Calcula cómo mostrar la fecha límite de una tarea:
// - "done": ya está realizada (sin importar la fecha).
// - "overdue": la fecha ya pasó y sigue sin terminar.
// - "soon": vence pronto (dentro de los próximos 3 días) y sigue sin terminar.
// - "normal": tiene fecha, pero no está ni vencida ni por vencer.
// - "none": no tiene fecha límite.
export function getDueState(dueDate: string | null, status: TaskStatus): DueState {
  if (isFinalStatus(status)) return "done";
  if (!dueDate) return "none";
  const due = new Date(dueDate);
  const now = new Date();
  if (due < now) return "overdue";
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= DUE_SOON_DAYS) return "soon";
  return "normal";
}
