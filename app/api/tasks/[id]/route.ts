import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TASK_FULL_INCLUDE } from "@/lib/selects";
import { notifyTaskAssignment } from "@/lib/notify";
import { computeAutoPriority } from "@/lib/autoPriority";
import { assertTaskAccess } from "@/lib/taskAccess";
import type { TaskStatus } from "@/lib/types";

function serializeTask<T extends { dependsOn: { dependsOn: { id: string; title: string } }[] }>(task: T) {
  return { ...task, dependsOn: task.dependsOn.map((d) => d.dependsOn) };
}

// Revisa si hacer que `taskId` dependa de `candidateDependsOnId` cerraría un
// ciclo (que candidateDependsOnId ya dependa, directa o indirectamente, de
// taskId). Si es así, esa dependencia se descarta en vez de guardarla.
async function wouldCreateCycle(projectId: string, taskId: string, candidateDependsOnId: string): Promise<boolean> {
  if (candidateDependsOnId === taskId) return true;
  const edges = await prisma.taskDependency.findMany({
    where: { task: { projectId } },
    select: { taskId: true, dependsOnId: true }
  });
  const graph = new Map<string, string[]>();
  edges.forEach((e) => {
    const list = graph.get(e.taskId) || [];
    list.push(e.dependsOnId);
    graph.set(e.taskId, list);
  });
  const visited = new Set<string>();
  const queue = [candidateDependsOnId];
  while (queue.length) {
    const current = queue.shift() as string;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    (graph.get(current) || []).forEach((next) => queue.push(next));
  }
  return false;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertTaskAccess(params.id, user.userId, user.role);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const full = await prisma.task.findUnique({
    where: { id: params.id },
    include: TASK_FULL_INCLUDE
  });
  return NextResponse.json(full ? serializeTask(full) : null);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertTaskAccess(params.id, user.userId, user.role);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) data.status = body.status;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;
  if (body.area !== undefined) data.area = body.area || null;
  if (body.phase !== undefined) data.phase = body.phase || null;
  if (body.budget !== undefined) {
    data.budget = body.budget === "" || body.budget === null ? null : Number(body.budget);
  }
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  // La prioridad se recalcula sola cuando cambia la fecha límite o el
  // estado (por si con eso cambian los días que faltan, o la tarea queda
  // terminada). Si no se puede calcular (sin fecha, o ya terminada), se
  // respeta la que se haya mandado a mano.
  if (body.dueDate !== undefined || body.status !== undefined) {
    const effectiveDueDate = body.dueDate !== undefined ? (data.dueDate as Date | null) : task.dueDate;
    const effectiveStatus = (body.status !== undefined ? body.status : task.status) as TaskStatus;
    const auto = computeAutoPriority(effectiveDueDate, effectiveStatus);
    if (auto) data.priority = auto;
    else if (body.priority !== undefined) data.priority = body.priority;
  } else if (body.priority !== undefined) {
    data.priority = body.priority;
  }

  await prisma.task.update({ where: { id: params.id }, data });

  // Si vienen dependencias nuevas, se reemplaza el conjunto completo (se
  // descartan las que formarían un ciclo).
  if (Array.isArray(body.dependsOnIds)) {
    const candidates = await prisma.task.findMany({
      where: { id: { in: body.dependsOnIds }, projectId: task.projectId },
      select: { id: true }
    });
    const validIds: string[] = [];
    for (const c of candidates) {
      if (c.id === params.id) continue;
      const cycle = await wouldCreateCycle(task.projectId, params.id, c.id);
      if (!cycle) validIds.push(c.id);
    }
    await prisma.taskDependency.deleteMany({ where: { taskId: params.id } });
    if (validIds.length > 0) {
      await prisma.taskDependency.createMany({
        data: validIds.map((id) => ({ taskId: params.id, dependsOnId: id })),
        skipDuplicates: true
      });
    }
  }

  const updated = await prisma.task.findUnique({
    where: { id: params.id },
    include: TASK_FULL_INCLUDE
  });
  if (!updated) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const assigneeChanged = body.assigneeId !== undefined && updated.assigneeId !== task.assigneeId;
  if (assigneeChanged && updated.assigneeId) {
    await notifyTaskAssignment({
      assigneeId: updated.assigneeId,
      actorId: user.userId,
      actorName: user.name,
      taskTitle: updated.title,
      projectName: task.project.name
    });
  }

  return NextResponse.json(serializeTask(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertTaskAccess(params.id, user.userId, user.role);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
