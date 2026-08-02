import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const message = await prisma.chatMessage.findUnique({ where: { id: params.id } });
  if (!message) return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });

  const isParticipant = message.senderId === user.userId || message.recipientId === user.userId;
  if (!isParticipant) return NextResponse.json({ error: "No tienes acceso a este archivo" }, { status: 403 });

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
