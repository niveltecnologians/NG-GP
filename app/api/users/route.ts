import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

const VALID_ROLES = ["ADMIN", "MEMBER", "CONTABILIDAD", "GERENTE"];

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  area: { select: { id: true, name: true, colorKey: true } },
  seesAllAreas: true,
  createdAt: true
} as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede ver esta lista" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: USER_LIST_SELECT,
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede crear usuarios" }, { status: 403 });
  }

  const { name, email, password, role, areaId, seesAllAreas } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nombre, email y contraseña son obligatorios" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
  }

  let validAreaId: string | null = null;
  if (areaId) {
    const area = await prisma.area.findUnique({ where: { id: areaId } });
    if (!area) return NextResponse.json({ error: "El área elegida ya no existe" }, { status: 400 });
    validAreaId = area.id;
  }

  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: VALID_ROLES.includes(role) ? role : "MEMBER",
      areaId: validAreaId,
      seesAllAreas: Boolean(seesAllAreas)
    },
    select: USER_LIST_SELECT
  });

  return NextResponse.json(created, { status: 201 });
}
