import { prisma } from "@/lib/prisma";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { computeAutoPriority } from "@/lib/priorityRules";

export { computeAutoPriority };

// Recalcula y guarda en la base de datos la prioridad automática de todas
// las tareas que apliquen (tienen fecha límite y no están terminadas). Se
// llama tanto desde las páginas que muestran tareas —para que siempre se
// vea al día apenas alguien entra— como desde un cron diario de respaldo,
// para que se actualice sola aunque nadie abra la app ese día.
export async function recalculateTaskPriorities(where: Record<string, unknown> = {}) {
  const tasks = await prisma.task.findMany({
    where: { dueDate: { not: null }, ...where },
    select: { id: true, dueDate: true, status: true, priority: true }
  });

  const idsByNewPriority = new Map<TaskPriority, string[]>();
  for (const t of tasks) {
    const auto = computeAutoPriority(t.dueDate, t.status as TaskStatus);
    if (auto && auto !== t.priority) {
      const ids = idsByNewPriority.get(auto) || [];
      ids.push(t.id);
      idsByNewPriority.set(auto, ids);
    }
  }

  await Promise.all(
    Array.from(idsByNewPriority.entries()).map(([priority, ids]) =>
      prisma.task.updateMany({ where: { id: { in: ids } }, data: { priority } })
    )
  );
}
