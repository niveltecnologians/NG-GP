import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ATTACHMENT_LIST_SELECT, TASK_ASSIGNEES_SELECT } from "@/lib/selects";

async function assertMember(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true }
  });
  if (!project) return null;
  const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
  return isMember ? project : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const project = await assertMember(params.id, user.userId);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const full = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: {
        include: {
          assignees: { select: TASK_ASSIGNEES_SELECT },
          createdBy: { select: { id: true, name: true, email: true } },
          attachments: { select: ATTACHMENT_LIST_SELECT }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  const serialized = full && {
    ...full,
    tasks: full.tasks.map((t) => ({ ...t, assignees: t.assignees.map((a) => a.user) }))
  };

  return NextResponse.json(serialized);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const project = await assertMember(params.id, user.userId);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (project.ownerId !== user.userId && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo el dueño o un administrador pueden editar el proyecto" }, { status: 403 });
  }

  const { name, description } = await req.json();
  const updated = await prisma.project.update({
    where: { id: params.id },
    data: { name, description }
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (project.ownerId !== user.userId && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo el dueño o un administrador pueden eliminar el proyecto" }, { status: 403 });
  }

  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
