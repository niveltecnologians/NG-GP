import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Lista y crea las tareas externas del usuario logueado: pendientes
// personales que no están ligadas a ninguna obra ni tablero, al estilo
// Google Tasks. Separado por completo del sistema de tareas de proyectos.

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const tasks = await prisma.personalTask.findMany({
    where: { userId: user.userId },
    orderBy: [{ done: "asc" }, { createdAt: "desc" }]
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { title } = await req.json();
  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  }

  const task = await prisma.personalTask.create({
    data: { title: String(title).trim(), userId: user.userId }
  });

  return NextResponse.json(task, { status: 201 });
}
