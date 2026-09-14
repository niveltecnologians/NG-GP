import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const teamMember = await prisma.teamMember.findUnique({ where: { id: params.id } });
  if (!teamMember || teamMember.ownerId !== user.userId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const { name, title } = await req.json();
  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const updated = await prisma.teamMember.update({
    where: { id: params.id },
    data: {
      name: name !== undefined ? String(name).trim() : undefined,
      title: title !== undefined ? (title ? String(title).trim() : null) : undefined
    }
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const teamMember = await prisma.teamMember.findUnique({ where: { id: params.id } });
  if (!teamMember || teamMember.ownerId !== user.userId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.teamMember.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

