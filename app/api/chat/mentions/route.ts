import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Lista los mensajes donde me mencionaron con @, con la conversación,
// quién me mencionó, y si ya le respondí desde entonces.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const mentions = await prisma.mention.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      message: {
        select: {
          id: true,
          body: true,
          createdAt: true,
          conversationId: true,
          parentMessageId: true,
          senderId: true,
          sender: { select: { id: true, name: true } },
          conversation: {
            select: {
              isGroup: true,
              name: true,
              members: { include: { user: { select: { id: true, name: true } } } }
            }
          }
        }
      }
    }
  });

  const results = await Promise.all(
    mentions
      .filter((mn) => mn.message.conversation !== null)
      .map(async (mn) => {
        const message = mn.message;
        const conversation = message.conversation!;

        // ¿Ya respondí en ese mismo canal/hilo después de que me mencionaran?
        const myReplyCount = await prisma.chatMessage.count({
          where: {
            conversationId: message.conversationId,
            parentMessageId: message.parentMessageId,
            senderId: user.userId,
            createdAt: { gt: message.createdAt }
          }
        });

        const others = conversation.members.filter((cm) => cm.userId !== user.userId).map((cm) => cm.user);
        const conversationName = conversation.isGroup
          ? conversation.name || others.map((o) => o.name).join(", ")
          : others[0]?.name || "Usuario eliminado";

        return {
          id: mn.id,
          messageId: message.id,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
          conversationId: message.conversationId,
          conversationName,
          senderName: message.sender?.name || "Usuario eliminado",
          isThreadReply: !!message.parentMessageId,
          parentMessageId: message.parentMessageId,
          answered: myReplyCount > 0,
          read: mn.readAt !== null
        };
      })
  );

  return NextResponse.json(results);
}
