import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const myConversations = await prisma.conversationMember.findMany({
    where: { userId: user.userId },
    select: { conversationId: true }
  });
  const conversationIds = myConversations.map((m) => m.conversationId);
  if (conversationIds.length === 0) return NextResponse.json([]);

  const results = await prisma.chatMessage.findMany({
    where: {
      conversationId: { in: conversationIds },
      type: "TEXT",
      body: { contains: q, mode: "insensitive" }
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      conversationId: true,
      parentMessageId: true,
      sender: { select: { id: true, name: true } },
      conversation: { select: { isGroup: true, name: true, members: { include: { user: { select: { id: true, name: true } } } } } }
    },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  const formatted = results.map((m) => {
    const others = m.conversation.members.filter((cm) => cm.userId !== user.userId).map((cm) => cm.user);
    const conversationName = m.conversation.isGroup
      ? m.conversation.name || others.map((o) => o.name).join(", ")
      : others[0]?.name || "Usuario eliminado";
    return {
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      conversationId: m.conversationId,
      conversationName,
      isThreadReply: !!m.parentMessageId,
      parentMessageId: m.parentMessageId,
      senderName: m.sender?.name || "Usuario eliminado"
    };
  });

  return NextResponse.json(formatted);
}
