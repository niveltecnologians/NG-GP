import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Quita a un miembro del grupo. La propia persona siempre puede salir; para
// quitar a alguien más hace falta ser quien creó el grupo.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { members: true }
  });
  if (!conversation) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  if (!conversation.isGroup) {
    return NextResponse.json({ error: "Esta acción solo aplica a grupos" }, { status: 400 });
  }

  const isSelf = params.userId === user.userId;
  const isCreator = conversation.createdById === user.userId;
  if (!isSelf && !isCreator) {
    return NextResponse.json({ error: "Solo quien creó el grupo puede quitar a otros miembros" }, { status: 403 });
  }

  const targetMembership = conversation.members.find((m) => m.userId === params.userId);
  if (!targetMembership) return NextResponse.json({ error: "Esa persona no es miembro del grupo" }, { status: 404 });

  await prisma.conversationMember.delete({ where: { id: targetMembership.id } });

  // Si el grupo se queda sin nadie, lo eliminamos para no dejar basura.
  const remaining = await prisma.conversationMember.count({ where: { conversationId: params.id } });
  if (remaining === 0) {
    await prisma.conversation.delete({ where: { id: params.id } });
  }

  return NextResponse.json({ ok: true });
}
