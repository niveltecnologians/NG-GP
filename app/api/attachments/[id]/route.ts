import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
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

  // Archivos nuevos (grandes): viven en Vercel Blob, solo redirigimos ahí.
  if (attachment.url) {
    return NextResponse.redirect(attachment.url);
  }

  // Archivos antiguos: siguen guardados como bytes en la base de datos.
  if (!attachment.data) {
    return NextResponse.json({ error: "Este archivo ya no está disponible" }, { status: 404 });
  }

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

  const attachment = await prisma.attachment.findUnique({
    where: { id: params.id },
    include: { task: { include: { project: true } } }
  });
  if (!attachment) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const canDelete =
    attachment.uploadedById === user.userId ||
    attachment.task.project.ownerId === user.userId ||
    user.role === "ADMIN";
  if (!canDelete) {
    return NextResponse.json(
      { error: "Solo quien subió el archivo, el dueño del proyecto o un administrador pueden eliminarlo" },
      { status: 403 }
    );
  }

  if (attachment.url) {
    await del(attachment.url).catch(() => {
      // si ya no existe en Blob, no pasa nada: igual borramos el registro.
    });
  }

  await prisma.attachment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
