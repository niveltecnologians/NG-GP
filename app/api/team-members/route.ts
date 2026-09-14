import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Equipo de trabajo propio de cada usuario: colaboradores sin acceso al
// sistema (solo nombre y cargo, ej. "Óscar Sánchez, Oficial") que puede
// asignar a sus tareas junto con los demás usuarios del proyecto. Cada
// usuario solo ve y administra su propio equipo.

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const teamMembers = await prisma.teamMember.findMany({
    where: { ownerId: user.userId },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json(teamMembers);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { name, title } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const teamMember = await prisma.teamMember.create({
    data: {
      name: String(name).trim(),
      title: title ? String(title).trim() : null,
      ownerId: user.userId
    }
  });
  return NextResponse.json(teamMember, { status: 201 });
}

