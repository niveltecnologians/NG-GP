import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Lista de posibles contactos (todos los demás usuarios registrados),
// con el último mensaje y cuántos mensajes sin leer tiene cada uno.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { id: { not: user.userId } },
    select: { id: true, name: true, email: true, hasAvatar: true },
    orderBy: { name: "asc" }
  });

  const contacts = await Promise.all(
    users.map(async (u) => {
      const [lastMessage, unreadCount] = await Promise.all([
        prisma.chatMessage.findFirst({
          where: {
            OR: [
              { senderId: user.userId, recipientId: u.id },
              { senderId: u.id, recipientId: user.userId }
            ]
          },
          orderBy: { createdAt: "desc" },
          select: { body: true, type: true, createdAt: true, senderId: true }
        }),
        prisma.chatMessage.count({
          where: { senderId: u.id, recipientId: user.userId, readAt: null }
        })
      ]);
      return {
        ...u,
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
              mine: lastMessage.senderId === user.userId
            }
          : null,
        unreadCount
      };
    })
  );

  contacts.sort((a, b) => {
    const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bt - at;
  });

  return NextResponse.json(contacts);
}
