import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  await prisma.user.update({ where: { id: user.userId }, data: { lastSeenAt: new Date() } });
  return NextResponse.json({ ok: true });
}
