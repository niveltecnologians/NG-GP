import { prisma } from "@/lib/prisma";

// Busca una conversación 1 a 1 ya existente entre dos usuarios, o la crea.
// De paso, "adopta" cualquier mensaje de la primera versión del chat
// (guardados solo con senderId/recipientId, sin conversationId) para que
// el historial no se pierda al pasar al modelo de conversaciones.
export async function findOrCreateDirectConversation(userIdA: string, userIdB: string) {
  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      members: { every: { userId: { in: [userIdA, userIdB] } } },
      AND: [{ members: { some: { userId: userIdA } } }, { members: { some: { userId: userIdB } } }]
    },
    include: { members: true }
  });

  if (existing && existing.members.length === 2) {
    return existing;
  }

  const created = await prisma.conversation.create({
    data: {
      isGroup: false,
      createdById: userIdA,
      members: { create: [{ userId: userIdA }, { userId: userIdB }] }
    },
    include: { members: true }
  });

  await prisma.chatMessage.updateMany({
    where: {
      conversationId: null,
      OR: [
        { senderId: userIdA, recipientId: userIdB },
        { senderId: userIdB, recipientId: userIdA }
      ]
    },
    data: { conversationId: created.id }
  });

  return created;
}
