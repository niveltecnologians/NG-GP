import { NextRequest, NextResponse } from "next/server";
import type { InviteCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { name, email, password, inviteCode } = await req.json();

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

  const userCount = await prisma.user.count();

  // El primer usuario del sistema no necesita código (todavía no hay
  // ningún administrador que pueda generarlo). Todos los siguientes sí.
  let invite: InviteCode | null = null;
  if (userCount > 0) {
    const code = (inviteCode || "").trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: "Necesitas un código de invitación para registrarte" }, { status: 400 });
    }
    invite = await prisma.inviteCode.findUnique({ where: { code } });
    if (!invite) {
      return NextResponse.json({ error: "Código de invitación inválido" }, { status: 400 });
    }
    if (invite.usedAt) {
      return NextResponse.json({ error: "Este código de invitación ya fue utilizado" }, { status: 400 });
    }
  }

  const passwordHash = await hashPassword(password);
  const role = userCount === 0 ? "ADMIN" : invite!.role;

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email, passwordHash, role }
    });
    if (invite) {
      await tx.inviteCode.update({
        where: { id: invite.id },
        data: { usedById: created.id, usedAt: new Date() }
      });
    }
    return created;
  });

  const token = await signSession({ userId: user.id, email: user.email, name: user.name, role: user.role });

  const res = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return res;
}
