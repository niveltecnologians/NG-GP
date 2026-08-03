import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

// Un administrador puede editar el nombre, correo, contraseña y rol de
// cualquier usuario (incluido a sí mismo).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede editar usuarios" }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const { name, email, password, role } = await req.json();
  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    data.name = name.trim();
  }

  if (email !== undefined && email.trim() !== target.email) {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
    data.email = email.trim();
  }

  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(password);
  }

  if (role !== undefined && role !== target.role) {
    if (target.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "No puedes quitarle el rol al único administrador" }, { status: 400 });
      }
    }
    data.role = role === "ADMIN" ? "ADMIN" : "MEMBER";
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });

  return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() });
}

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
