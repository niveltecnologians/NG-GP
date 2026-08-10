import { isFinalStatus } from "@/lib/taskDates";
import type { TaskPriority, TaskStatus } from "@/lib/types";

// Reglas puras de la prioridad automática (sin tocar la base de datos), para
// poder usarlas tanto en el servidor como en el navegador (por ejemplo, para
// mostrar en el formulario qué prioridad le va a quedar a una tarea antes de
// guardarla).

// Umbrales, en días restantes hasta la fecha límite (pueden ser negativos
// si ya está vencida).
const URGENT_MAX_DAYS = 3;
const HIGH_MAX_DAYS = 7;
const MEDIUM_MAX_DAYS = 12;

// Calcula la prioridad que le correspondería a una tarea según cuánto
// falta para su fecha límite. Devuelve null cuando no se puede calcular
// (sin fecha límite, o ya terminada), y en ese caso se respeta la
// prioridad que la persona haya elegido a mano.
export function computeAutoPriority(dueDate: Date | string | null, status: TaskStatus): TaskPriority | null {
  if (!dueDate || isFinalStatus(status)) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= URGENT_MAX_DAYS) return "URGENT";
  if (diffDays <= HIGH_MAX_DAYS) return "HIGH";
  if (diffDays <= MEDIUM_MAX_DAYS) return "MEDIUM";
  return "LOW";
}
