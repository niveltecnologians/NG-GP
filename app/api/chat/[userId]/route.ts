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
  recipientId: true,
  readAt: true,
  createdAt: true
} as const;

const MAX_SIZE = 8 * 1024 * 1024; // 8MB (fotos, audios cortos, archivos chicos)

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const other = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!other) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const messages = await prisma.chatMessage.findMany({
    where: {
      OR: [
        { senderId: user.userId, recipientId: params.userId },
        { senderId: params.userId, recipientId: user.userId }
      ]
    },
    select: MESSAGE_SELECT,
    orderBy: { createdAt: "asc" }
  });

  // Marca como leídos los mensajes que me enviaron.
  await prisma.chatMessage.updateMany({
    where: { senderId: params.userId, recipientId: user.userId, readAt: null },
    data: { readAt: new Date() }
  });

  return NextResponse.json(
    messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), readAt: m.readAt ? m.readAt.toISOString() : null }))
  );
}

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const other = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!other) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const { body } = await req.json();
    if (!body || !body.trim()) {
      return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
    }
    const message = await prisma.chatMessage.create({
      data: { type: "TEXT", body: body.trim(), senderId: user.userId, recipientId: params.userId },
      select: MESSAGE_SELECT
    });
    return NextResponse.json({ ...message, createdAt: message.createdAt.toISOString(), readAt: null }, { status: 201 });
  }

  // multipart/form-data: imagen, audio o archivo
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kind = (formData.get("kind") as string | null) || "FILE"; // IMAGE | AUDIO | FILE
  if (!file) return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "El archivo supera los 8MB" }, { status: 413 });

  const type: "IMAGE" | "AUDIO" | "FILE" = kind === "IMAGE" ? "IMAGE" : kind === "AUDIO" ? "AUDIO" : "FILE";
  const buffer = Buffer.from(await file.arrayBuffer());

  const message = await prisma.chatMessage.create({
    data: {
      type,
      senderId: user.userId,
      recipientId: params.userId,
      fileData: buffer,
      fileName: file.name,
      fileMimeType: file.type || "application/octet-stream",
      fileSize: file.size
    },
    select: MESSAGE_SELECT
  });

  return NextResponse.json({ ...message, createdAt: message.createdAt.toISOString(), readAt: null }, { status: 201 });
}
