import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const attachment = await prisma.attachment.findUnique({
    where: { id: params.id },
    include: { task: { include: { project: { include: { members: true } } } } }
  });
  if (!attachment) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const isMember =
    attachment.task.project.ownerId === user.userId ||
    attachment.task.project.members.some((m) => m.userId === user.userId);
  if (!isMember) return NextResponse.json({ error: "No tienes acceso a este archivo" }, { status: 403 });

  return new NextResponse(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
      "Content-Length": String(attachment.size)
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const attachment = await prisma.attachment.findUnique({ where: { id: params.id } });
  if (!attachment) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  if (attachment.uploadedById !== user.userId) {
    return NextResponse.json({ error: "Solo quien subió el archivo puede eliminarlo" }, { status: 403 });
  }

  await prisma.attachment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
