import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { generatePortalToken } from "@/lib/clientPortal";

// Solo el dueño del proyecto o un administrador pueden crear y administrar
// los accesos de cliente. Un miembro común del equipo no.
async function assertCanManage(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true }
  });
  if (!project) return null;
  if (project.ownerId !== userId && role !== "ADMIN") return null;
  return project;
}

const ACCESS_SELECT = {
  id: true,
  name: true,
  email: true,
  token: true,
  active: true,
  showBudget: true,
  lastVisitAt: true,
  createdAt: true
} as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const project = await assertCanManage(params.id, user.userId, user.role);
  if (!project) return NextResponse.json({ error: "No tienes acceso a este proyecto" }, { status: 403 });

  const accesses = await prisma.clientAccess.findMany({
    where: { projectId: params.id },
    select: { ...ACCESS_SELECT, pinHash: true },
    orderBy: { createdAt: "asc" }
  });

  // Nunca se devuelve el hash del PIN al navegador: solo si tiene o no.
  return NextResponse.json(
    accesses.map(({ pinHash, ...rest }) => ({ ...rest, hasPin: Boolean(pinHash) }))
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const project = await assertCanManage(params.id, user.userId, user.role);
  if (!project) return NextResponse.json({ error: "No tienes acceso a este proyecto" }, { status: 403 });

  const { name, email, pin, showBudget } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "El nombre del cliente es obligatorio" }, { status: 400 });
  }
  if (pin && String(pin).length < 4) {
    return NextResponse.json({ error: "El PIN debe tener al menos 4 caracteres" }, { status: 400 });
  }

  const created = await prisma.clientAccess.create({
    data: {
      projectId: params.id,
      name: String(name).trim(),
      email: email ? String(email).trim() : null,
      token: generatePortalToken(),
      pinHash: pin ? await hashPassword(String(pin)) : null,
      showBudget: Boolean(showBudget),
      createdById: user.userId
    },
    select: ACCESS_SELECT
  });

  return NextResponse.json({ ...created, hasPin: Boolean(pin) }, { status: 201 });
}
