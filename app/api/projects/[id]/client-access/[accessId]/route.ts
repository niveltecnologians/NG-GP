import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { generatePortalToken } from "@/lib/clientPortal";

async function assertCanManage(projectId: string, accessId: string, userId: string, role: string) {
  const access = await prisma.clientAccess.findUnique({
    where: { id: accessId },
    select: { id: true, projectId: true, project: { select: { ownerId: true } } }
  });
  if (!access || access.projectId !== projectId) return null;
  if (access.project.ownerId !== userId && role !== "ADMIN") return null;
  return access;
}

const ACCESS_SELECT = {
  id: true,
  name: true,
  email: true,
  token: true,
  active: true,
  showBudget: true,
  showSchedule: true,
  lastVisitAt: true,
  createdAt: true
} as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; accessId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const access = await assertCanManage(params.id, params.accessId, user.userId, user.role);
  if (!access) return NextResponse.json({ error: "No tienes acceso a este portal" }, { status: 403 });

  const { name, email, active, showBudget, showSchedule, pin, clearPin, regenerateToken } = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (email !== undefined) data.email = email ? String(email).trim() : null;
  if (typeof active === "boolean") data.active = active;
  if (typeof showBudget === "boolean") data.showBudget = showBudget;
  if (typeof showSchedule === "boolean") data.showSchedule = showSchedule;

  // Quitar el PIN deja el portal abierto solo con el enlace.
  if (clearPin === true) {
    data.pinHash = null;
  } else if (pin) {
    if (String(pin).length < 4) {
      return NextResponse.json({ error: "El PIN debe tener al menos 4 caracteres" }, { status: 400 });
    }
    data.pinHash = await hashPassword(String(pin));
  }

  // Regenerar el enlace invalida el anterior al instante: sirve si el cliente
  // reenvió el enlace a alguien que no debía verlo.
  if (regenerateToken === true) data.token = generatePortalToken();

  const updated = await prisma.clientAccess.update({
    where: { id: params.accessId },
    data,
    select: { ...ACCESS_SELECT, pinHash: true }
  });

  const { pinHash, ...rest } = updated;
  return NextResponse.json({ ...rest, hasPin: Boolean(pinHash) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; accessId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const access = await assertCanManage(params.id, params.accessId, user.userId, user.role);
  if (!access) return NextResponse.json({ error: "No tienes acceso a este portal" }, { status: 403 });

  await prisma.clientAccess.delete({ where: { id: params.accessId } });
  return NextResponse.json({ ok: true });
}
