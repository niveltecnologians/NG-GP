import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { findOrCreateDirectConversation } from "@/lib/chat";
import { isOnline } from "@/lib/presence";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const memberships = await prisma.conversationMember.findMany({
    where: { userId: user.userId },
    include: {
      conversation: {
        include: {
          members: { include: { user: { select: { id: true, name: true, hasAvatar: true, lastSeenAt: true } } } }
        }
      }
    }
  });

  const conversations = await Promise.all(
    memberships.map(async (m) => {
      const conv = m.conversation;
      const others = conv.members.filter((cm) => cm.userId !== user.userId).map((cm) => cm.user);

      const [lastMessage, unreadCount] = await Promise.all([
        prisma.chatMessage.findFirst({
          where: { conversationId: conv.id },
          orderBy: { createdAt: "desc" },
          select: { body: true, type: true, createdAt: true, senderId: true, sender: { select: { name: true } } }
        }),
        prisma.chatMessage.count({
          where: {
            conversationId: conv.id,
            senderId: { not: user.userId },
            createdAt: { gt: m.lastReadAt || new Date(0) }
          }
        })
      ]);

      const displayName = conv.isGroup
        ? conv.name || others.map((o) => o.name).join(", ")
        : others[0]?.name || "Usuario eliminado";

      return {
        id: conv.id,
        isGroup: conv.isGroup,
        name: displayName,
        memberCount: conv.members.length,
        otherUser: !conv.isGroup && others[0] ? { id: others[0].id, hasAvatar: others[0].hasAvatar } : null,
        online: conv.isGroup
          ? others.filter((o) => isOnline(o.lastSeenAt)).length
          : others[0]
          ? isOnline(others[0].lastSeenAt)
          : false,
        lastMessage: lastMessage
          ? {
              preview:
                lastMessage.type === "TEXT"
                  ? lastMessage.body
                  : lastMessage.type === "IMAGE"
                  ? "📷 Foto"
                  : lastMessage.type === "AUDIO"
                  ? "🎤 Audio"
                  : "📎 Archivo",
              createdAt: lastMessage.createdAt.toISOString(),
              mine: lastMessage.senderId === user.userId,
              senderName: lastMessage.sender?.name || null
            }
          : null,
        unreadCount,
        updatedAt: conv.updatedAt.toISOString()
      };
    })
  );

  conversations.sort((a, b) => {
    const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
    const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
    return bt - at;
  });

  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { memberIds, name } = await req.json();
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una persona" }, { status: 400 });
  }
  const uniqueIds: string[] = Array.from(new Set(memberIds.filter((id: string) => id !== user.userId)));
  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos otra persona" }, { status: 400 });
  }

  // Un solo destinatario y sin nombre de grupo => conversación 1 a 1 (se
  // reutiliza si ya existía).
  if (uniqueIds.length === 1 && !name) {
    const conv = await findOrCreateDirectConversation(user.userId, uniqueIds[0]);
    return NextResponse.json({ id: conv.id }, { status: 201 });
  }

  const others = await prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, name: true } });
  if (others.length === 0) {
    return NextResponse.json({ error: "No se encontraron los usuarios seleccionados" }, { status: 400 });
  }

  const conv = await prisma.conversation.create({
    data: {
      isGroup: true,
      name: name?.trim() || others.map((o) => o.name).join(", "),
      createdById: user.userId,
      members: {
        create: [{ userId: user.userId }, ...others.map((o) => ({ userId: o.id }))]
      }
    }
  });

  return NextResponse.json({ id: conv.id }, { status: 201 });
}
