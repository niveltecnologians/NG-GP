import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede revocar códigos" }, { status: 403 });
  }

  const invite = await prisma.inviteCode.findUnique({ where: { id: params.id } });
  if (!invite) return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });
  if (invite.usedAt) {
    return NextResponse.json({ error: "Este código ya fue usado, no se puede revocar" }, { status: 400 });
  }

  await prisma.inviteCode.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
