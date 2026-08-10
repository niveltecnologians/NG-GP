import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ATTACHMENT_LIST_SELECT, SUBTASK_LIST_SELECT } from "@/lib/selects";
import { BOARD_MODE_COLUMNS, BoardMode } from "@/lib/types";

async function assertAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } } }
  });
  if (!task) return null;
  const isMember = task.project.ownerId === userId || task.project.members.some((m) => m.userId === userId);
  return isMember ? task : null;
}

// Marca/desmarca una subtarea, o le cambia el título. Si con este cambio
// quedan todas las subtareas hechas, la tarea completa pasa sola a su
// estado final (última columna del modo de tablero del proyecto). No pasa
// al revés: si luego desmarcas una subtarea, la tarea no vuelve atrás sola.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; subtaskId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertAccess(params.id, user.userId);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const subtask = await prisma.subTask.findUnique({ where: { id: params.subtaskId } });
  if (!subtask || subtask.taskId !== params.id) {
    return NextResponse.json({ error: "Subtarea no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.done !== undefined) data.done = Boolean(body.done);

  const updatedSubtask = await prisma.subTask.update({
    where: { id: params.subtaskId },
    data,
    select: SUBTASK_LIST_SELECT
  });

  let updatedTask = null;
  if (body.done !== undefined) {
    const siblings = await prisma.subTask.findMany({ where: { taskId: params.id } });
    const allDone = siblings.length > 0 && siblings.every((s) => s.done);
    if (allDone) {
      const finalStatus = [...BOARD_MODE_COLUMNS[task.project.boardMode as BoardMode]].pop()!;
      if (task.status !== finalStatus) {
        updatedTask = await prisma.task.update({
          where: { id: params.id },
          data: { status: finalStatus },
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            attachments: { select: ATTACHMENT_LIST_SELECT },
            subtasks: { select: SUBTASK_LIST_SELECT, orderBy: { order: "asc" } }
          }
        });
      }
    }
  }

  return NextResponse.json({ subtask: updatedSubtask, task: updatedTask });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; subtaskId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await assertAccess(params.id, user.userId);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const subtask = await prisma.subTask.findUnique({ where: { id: params.subtaskId } });
  if (!subtask || subtask.taskId !== params.id) {
    return NextResponse.json({ error: "Subtarea no encontrada" }, { status: 404 });
  }

  await prisma.subTask.delete({ where: { id: params.subtaskId } });
  return NextResponse.json({ ok: true });
}
