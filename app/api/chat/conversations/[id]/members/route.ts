import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { members: true }
  });
  if (!conversation) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  if (!conversation.isGroup) {
    return NextResponse.json({ error: "Solo se pueden agregar miembros a un grupo" }, { status: 400 });
  }
  const isMember = conversation.members.some((m) => m.userId === user.userId);
  if (!isMember) return NextResponse.json({ error: "No perteneces a este grupo" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Falta el usuario a agregar" }, { status: 400 });

  const alreadyMember = conversation.members.some((m) => m.userId === userId);
  if (alreadyMember) return NextResponse.json({ error: "Ya es parte del grupo" }, { status: 409 });

  await prisma.conversationMember.create({ data: { conversationId: params.id, userId } });
  return NextResponse.json({ ok: true });
}
