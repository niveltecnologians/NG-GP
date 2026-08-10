// Cálculo de ruta crítica (CPM: Critical Path Method), puro y sin
// dependencias externas, para poder usarlo tanto en el servidor como en el
// navegador (el diagrama de Gantt lo corre en el navegador con los datos
// que ya tiene cargados).
//
// Cómo funciona: cada tarea tiene una duración (calculada a partir de su
// fecha de inicio y fecha límite) y puede depender de otras tareas del
// mismo proyecto (no puede empezar hasta que esas terminen). Con eso se
// calcula, para cada tarea, el inicio/fin "más próximo posible" (si todo
// empezara lo antes posible) y el inicio/fin "más lejano posible" (sin
// atrasar el proyecto completo). La diferencia entre ambos es la holgura:
// las tareas con holgura cero forman la ruta crítica — si cualquiera de
// ellas se atrasa, se atrasa todo el proyecto.
//
// Importante: la posición de las barras en el Gantt usa las fechas reales
// que cada quien puso en la tarea; la ruta crítica se calcula sobre la
// duración y el orden de dependencias, que es lo que de verdad determina
// qué tan corto puede quedar el proyecto.

export type GanttTaskInput = {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  dependsOnIds: string[];
};

export type GanttTaskResult = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  durationDays: number;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  slack: number;
  critical: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeCriticalPath(tasks: GanttTaskInput[]): GanttTaskResult[] {
  // Solo entran al cálculo las tareas que tienen al menos una fecha.
  const usable = tasks.filter((t) => t.startDate || t.dueDate);
  const byId = new Map(usable.map((t) => [t.id, t]));

  function boundsOf(t: GanttTaskInput) {
    const start = t.startDate ? new Date(t.startDate) : new Date(t.dueDate as string);
    const end = t.dueDate ? new Date(t.dueDate) : new Date(t.startDate as string);
    return { start, end };
  }

  function durationOf(t: GanttTaskInput) {
    const { start, end } = boundsOf(t);
    const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
    return Math.max(days, 1);
  }

  // Solo se cuentan dependencias hacia tareas que también tienen fecha (si
  // no, no se pueden ubicar en el cálculo).
  const deps = new Map<string, string[]>();
  usable.forEach((t) => deps.set(t.id, t.dependsOnIds.filter((id) => byId.has(id))));

  const successors = new Map<string, string[]>();
  usable.forEach((t) => successors.set(t.id, []));
  deps.forEach((list, id) => list.forEach((depId) => successors.get(depId)?.push(id)));

  // Orden topológico (Kahn) para poder hacer el paso hacia adelante en el
  // orden correcto.
  const remaining = new Map<string, number>();
  usable.forEach((t) => remaining.set(t.id, (deps.get(t.id) || []).length));
  const queue = usable.filter((t) => (remaining.get(t.id) || 0) === 0).map((t) => t.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift() as string;
    order.push(id);
    (successors.get(id) || []).forEach((succId) => {
      remaining.set(succId, (remaining.get(succId) || 0) - 1);
      if (remaining.get(succId) === 0) queue.push(succId);
    });
  }
  // Si algo quedó afuera (un ciclo, que no debería poder guardarse), se
  // agrega al final para no perder la tarea del resultado.
  usable.forEach((t) => {
    if (!order.includes(t.id)) order.push(t.id);
  });

  const dur = new Map(usable.map((t) => [t.id, durationOf(t)]));
  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  order.forEach((id) => {
    const predIds = deps.get(id) || [];
    const start = predIds.length === 0 ? 0 : Math.max(...predIds.map((p) => ef.get(p) ?? 0));
    es.set(id, start);
    ef.set(id, start + (dur.get(id) || 1));
  });

  const projectEnd = Math.max(0, ...Array.from(ef.values()));

  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  [...order].reverse().forEach((id) => {
    const succIds = successors.get(id) || [];
    const finish = succIds.length === 0 ? projectEnd : Math.min(...succIds.map((s) => ls.get(s) ?? projectEnd));
    lf.set(id, finish);
    ls.set(id, finish - (dur.get(id) || 1));
  });

  return usable.map((t) => {
    const { start, end } = boundsOf(t);
    const slack = (ls.get(t.id) ?? 0) - (es.get(t.id) ?? 0);
    return {
      id: t.id,
      title: t.title,
      start,
      end,
      durationDays: dur.get(t.id) || 1,
      es: es.get(t.id) ?? 0,
      ef: ef.get(t.id) ?? 0,
      ls: ls.get(t.id) ?? 0,
      lf: lf.get(t.id) ?? 0,
      slack,
      critical: slack <= 0
    };
  });
}
