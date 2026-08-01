import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Lista los proyectos donde el usuario es dueño o miembro
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: {
      OR: [{ ownerId: user.userId }, { members: { some: { userId: user.userId } } }]
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { tasks: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const project = await prisma.project.create({
    data: {
      name,
      description,
      ownerId: user.userId,
      members: { create: [{ userId: user.userId }] }
    },
    include: { owner: true, members: { include: { user: true } } }
  });

  return NextResponse.json(project, { status: 201 });
}
