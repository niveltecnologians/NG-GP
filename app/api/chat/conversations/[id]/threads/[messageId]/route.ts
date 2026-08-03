import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const MESSAGE_SELECT = {
  id: true,
  type: true,
  body: true,
  fileName: true,
  fileMimeType: true,
  fileSize: true,
  senderId: true,
  createdAt: true,
  editedAt: true,
  sender: { select: { id: true, name: true, hasAvatar: true } }
} as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string; messageId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: user.userId } }
  });
  if (!membership) return NextResponse.json({ error: "No tienes acceso a esta conversación" }, { status: 403 });

  const parent = await prisma.chatMessage.findFirst({
    where: { id: params.messageId, conversationId: params.id },
    select: MESSAGE_SELECT
  });
  if (!parent) return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });

  const replies = await prisma.chatMessage.findMany({
    where: { parentMessageId: params.messageId, conversationId: params.id },
    select: MESSAGE_SELECT,
    orderBy: { createdAt: "asc" }
  });

  // Ver el hilo cuenta como "leída" la mención del mensaje raíz y de sus respuestas.
  const relatedIds = [params.messageId, ...replies.map((r) => r.id)];
  await prisma.mention.updateMany({
    where: { userId: user.userId, messageId: { in: relatedIds }, readAt: null },
    data: { readAt: new Date() }
  });

  return NextResponse.json({
    parent: { ...parent, createdAt: parent.createdAt.toISOString() },
    replies: replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
  });
}
