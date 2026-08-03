import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { extractMentionedUserIds } from "@/lib/mentions";

// Permite a quien mandó un mensaje de texto corregirlo después de enviado.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const message = await prisma.chatMessage.findUnique({ where: { id: params.id } });
  if (!message) return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  if (message.senderId !== user.userId) {
    return NextResponse.json({ error: "Solo quien envió el mensaje puede editarlo" }, { status: 403 });
  }
  if (message.type !== "TEXT") {
    return NextResponse.json({ error: "Solo se pueden editar mensajes de texto" }, { status: 400 });
  }

  const { body } = await req.json();
  if (!body || !body.trim()) {
    return NextResponse.json({ error: "El mensaje no puede quedar vacío" }, { status: 400 });
  }

  const updated = await prisma.chatMessage.update({
    where: { id: params.id },
    data: { body: body.trim(), editedAt: new Date() },
    select: {
      id: true,
      type: true,
      body: true,
      editedAt: true,
      senderId: true,
      createdAt: true,
      conversationId: true,
      sender: { select: { id: true, name: true, hasAvatar: true } }
    }
  });

  // Vuelve a calcular las menciones por si cambió a quién mencionó.
  if (updated.conversationId) {
    await prisma.mention.deleteMany({ where: { messageId: updated.id } });
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: updated.conversationId },
      include: { user: { select: { id: true, name: true } } }
    });
    const mentionedIds = extractMentionedUserIds(updated.body || "", members.map((m) => m.user)).filter(
      (id) => id !== user.userId
    );
    if (mentionedIds.length > 0) {
      await prisma.mention.createMany({
        data: mentionedIds.map((userId) => ({ messageId: updated.id, userId })),
        skipDuplicates: true
      });
    }
  }

  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    editedAt: updated.editedAt ? updated.editedAt.toISOString() : null
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const message = await prisma.chatMessage.findUnique({ where: { id: params.id } });
  if (!message) return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });

  let isParticipant = message.senderId === user.userId || message.recipientId === user.userId;
  if (!isParticipant && message.conversationId) {
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId: user.userId } }
    });
    isParticipant = !!membership;
  }
  if (!isParticipant) return NextResponse.json({ error: "No tienes acceso a este archivo" }, { status: 403 });

  // Archivos nuevos (grandes): viven en Vercel Blob, solo redirigimos ahí.
  if (message.fileUrl) {
    return NextResponse.redirect(message.fileUrl);
  }

  if (!message.fileData || !message.fileMimeType) {
    return NextResponse.json({ error: "Este mensaje no tiene archivo" }, { status: 404 });
  }

  const disposition = message.type === "FILE" ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(message.fileData), {
    headers: {
      "Content-Type": message.fileMimeType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(message.fileName || "archivo")}"`,
      "Cache-Control": "private, max-age=3600"
    }
  });
}
