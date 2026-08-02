import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function generateCode() {
  // Código legible tipo AB12-CD34
  const raw = randomBytes(4).toString("hex").toUpperCase(); // 8 caracteres
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

const INVITE_SELECT = {
  id: true,
  code: true,
  role: true,
  usedAt: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
  usedBy: { select: { id: true, name: true, email: true } }
} as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede ver los códigos de invitación" }, { status: 403 });
  }

  const invites = await prisma.inviteCode.findMany({
    select: INVITE_SELECT,
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede generar códigos de invitación" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const role = body?.role === "ADMIN" ? "ADMIN" : "MEMBER";

  let code = generateCode();
  // Muy improbable que choque, pero por si acaso reintenta.
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.inviteCode.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
  }

  const invite = await prisma.inviteCode.create({
    data: { code, role, createdById: user.userId },
    select: INVITE_SELECT
  });

  return NextResponse.json(invite, { status: 201 });
}
