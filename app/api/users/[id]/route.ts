import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede eliminar usuarios" }, { status: 403 });
  }
  if (params.id === user.userId) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "No puedes eliminar al único administrador del sistema" }, { status: 400 });
    }
  }

  // Reasigna al administrador que elimina los proyectos que este usuario poseía,
  // y lo quita de la membresía de cualquier otro proyecto.
  const ownedProjects = await prisma.project.findMany({ where: { ownerId: params.id } });
  for (const project of ownedProjects) {
    await prisma.project.update({ where: { id: project.id }, data: { ownerId: user.userId } });
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: user.userId } },
      update: {},
      create: { projectId: project.id, userId: user.userId }
    });
  }
  await prisma.projectMember.deleteMany({ where: { userId: params.id } });

  // Quita al usuario como responsable de tareas (no borra el historial de tareas).
  await prisma.task.updateMany({ where: { assigneeId: params.id }, data: { assigneeId: null } });

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
