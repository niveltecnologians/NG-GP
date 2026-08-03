import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Quita a alguien del proyecto. El dueño o cualquier administrador pueden
// quitar a otros; cualquier miembro puede salirse a sí mismo. Al dueño no
// se le puede quitar así (para eso hay que transferir el proyecto).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const isSelf = params.userId === user.userId;
  const canManage = project.ownerId === user.userId || user.role === "ADMIN";
  if (!isSelf && !canManage) {
    return NextResponse.json({ error: "Solo el dueño o un administrador pueden quitar miembros" }, { status: 403 });
  }
  if (params.userId === project.ownerId) {
    return NextResponse.json({ error: "No puedes quitar al dueño del proyecto" }, { status: 400 });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.id, userId: params.userId } }
  });
  if (!membership) return NextResponse.json({ error: "Esa persona no es miembro del proyecto" }, { status: 404 });

  await prisma.projectMember.delete({ where: { id: membership.id } });

  // Lo quita como responsable de tareas del proyecto (conserva el historial).
  await prisma.task.updateMany({
    where: { projectId: params.id, assigneeId: params.userId },
    data: { assigneeId: null }
  });

  return NextResponse.json({ ok: true });
}
