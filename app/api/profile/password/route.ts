import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Completa la contraseña actual y la nueva" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "La contraseña nueva debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 });

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
