import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isOnline } from "@/lib/presence";
import { extractMentionedUserIds } from "@/lib/mentions";

const MESSAGE_SELECT = {
  id: true,
  type: true,
  body: true,
  fileName: true,
  fileMimeType: true,
  fileSize: true,
  senderId: true,
  createdAt: true,
  sender: { select: { id: true, name: true, hasAvatar: true } }
} as const;

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

async function assertMembership(conversationId: string, userId: string) {
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } }
  });
  return !!membership;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const isMember = await assertMembership(params.id, user.userId);
  if (!isMember) return NextResponse.json({ error: "No tienes acceso a esta conversación" }, { status: 403 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: { select: { id: true, name: true, bio: true, hasAvatar: true, lastSeenAt: true } } } }
    }
  });
  if (!conversation) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  // Solo los mensajes "de canal" (sin parentMessageId); las respuestas de
  // hilo se consultan aparte, en /threads/[messageId].
  const [messages, replyCounts] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { conversationId: params.id, parentMessageId: null },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: "asc" }
    }),
    prisma.chatMessage.groupBy({
      by: ["parentMessageId"],
      where: { conversationId: params.id, parentMessageId: { not: null } },
      _count: { _all: true }
    })
  ]);

  const replyCountMap = new Map(replyCounts.map((r) => [r.parentMessageId as string, r._count._all]));

  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId: params.id, userId: user.userId } },
    data: { lastReadAt: new Date() }
  });

  const others = conversation.members.filter((m) => m.userId !== user.userId).map((m) => m.user);

  return NextResponse.json({
    id: conversation.id,
    isGroup: conversation.isGroup,
    name: conversation.isGroup ? conversation.name || others.map((o) => o.name).join(", ") : others[0]?.name || "Usuario eliminado",
    isCreator: conversation.createdById === user.userId,
    otherUser:
      !conversation.isGroup && others[0]
        ? { id: others[0].id, bio: others[0].bio, hasAvatar: others[0].hasAvatar, online: isOnline(others[0].lastSeenAt) }
        : null,
    members: others.map((o) => ({ id: o.id, name: o.name, hasAvatar: o.hasAvatar, online: isOnline(o.lastSeenAt) })),
    messages: messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      replyCount: replyCountMap.get(m.id) || 0
    }))
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const isMember = await assertMembership(params.id, user.userId);
  if (!isMember) return NextResponse.json({ error: "No tienes acceso a esta conversación" }, { status: 403 });

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = await req.json();
    const parentMessageId = payload.parentMessageId || null;

    let message;
    if (payload.fileUrl) {
      // Archivo grande ya subido a Vercel Blob: solo confirmamos.
      const kind = payload.kind as string | undefined;
      const type: "IMAGE" | "AUDIO" | "FILE" = kind === "IMAGE" ? "IMAGE" : kind === "AUDIO" ? "AUDIO" : "FILE";
      message = await prisma.chatMessage.create({
        data: {
          type,
          senderId: user.userId,
          conversationId: params.id,
          parentMessageId,
          fileUrl: payload.fileUrl,
          fileName: payload.fileName || "archivo",
          fileMimeType: payload.fileMimeType || "application/octet-stream",
          fileSize: payload.fileSize || 0
        },
        select: MESSAGE_SELECT
      });
    } else {
      const body = payload.body as string | undefined;
      if (!body || !body.trim()) {
        return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
      }
      message = await prisma.chatMessage.create({
        data: {
          type: "TEXT",
          body: body.trim(),
          senderId: user.userId,
          conversationId: params.id,
          parentMessageId
        },
        select: MESSAGE_SELECT
      });

      // Detecta menciones "@Nombre" y las guarda para el panel de menciones.
      const members = await prisma.conversationMember.findMany({
        where: { conversationId: params.id },
        include: { user: { select: { id: true, name: true } } }
      });
      const mentionedIds = extractMentionedUserIds(
        message.body || "",
        members.map((m) => m.user)
      ).filter((id) => id !== user.userId);
      if (mentionedIds.length > 0) {
        await prisma.mention.createMany({
          data: mentionedIds.map((userId) => ({ messageId: message.id, userId })),
          skipDuplicates: true
        });
      }
    }

    await prisma.conversation.update({ where: { id: params.id }, data: { updatedAt: new Date() } });
    return NextResponse.json({ ...message, createdAt: message.createdAt.toISOString(), replyCount: 0 }, { status: 201 });
  }

  // Ruta antigua: archivos chicos, guardados directamente como bytes.
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kind = (formData.get("kind") as string | null) || "FILE";
  const parentMessageId = (formData.get("parentMessageId") as string | null) || null;
  if (!file) return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "El archivo supera los 8MB" }, { status: 413 });

  const type: "IMAGE" | "AUDIO" | "FILE" = kind === "IMAGE" ? "IMAGE" : kind === "AUDIO" ? "AUDIO" : "FILE";
  const buffer = Buffer.from(await file.arrayBuffer());

  const message = await prisma.chatMessage.create({
    data: {
      type,
      senderId: user.userId,
      conversationId: params.id,
      parentMessageId,
      fileData: buffer,
      fileName: file.name,
      fileMimeType: file.type || "application/octet-stream",
      fileSize: file.size
    },
    select: MESSAGE_SELECT
  });
  await prisma.conversation.update({ where: { id: params.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ...message, createdAt: message.createdAt.toISOString(), replyCount: 0 }, { status: 201 });
}

// Elimina un grupo por completo (mensajes, hilos e integrantes incluidos).
// Solo quien creó el grupo puede hacerlo. No aplica a conversaciones 1 a 1.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  if (!conversation.isGroup) {
    return NextResponse.json({ error: "Las conversaciones 1 a 1 no se pueden eliminar" }, { status: 400 });
  }
  if (conversation.createdById !== user.userId) {
    return NextResponse.json({ error: "Solo quien creó el grupo puede eliminarlo" }, { status: 403 });
  }

  await prisma.conversation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
