import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (project.ownerId !== user.userId) {
    return NextResponse.json({ error: "Solo el dueño puede agregar miembros" }, { status: 403 });
  }

  const { email } = await req.json();
  const member = await prisma.user.findUnique({ where: { email } });
  if (!member) return NextResponse.json({ error: "No existe un usuario con ese email" }, { status: 404 });

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.id, userId: member.id } }
  });
  if (existing) return NextResponse.json({ error: "Ya es miembro del proyecto" }, { status: 409 });

  await prisma.projectMember.create({ data: { projectId: params.id, userId: member.id } });
  return NextResponse.json({ ok: true });
}
