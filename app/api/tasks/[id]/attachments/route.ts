import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ATTACHMENT_LIST_SELECT } from "@/lib/selects";

// Los adjuntos se guardan como bytes directamente en la base de datos
// (no en disco), porque en despliegues serverless como Vercel el sistema
// de archivos no es persistente entre invocaciones.
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { project: { include: { members: true } } }
  });
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  const isMember =
    task.project.ownerId === user.userId || task.project.members.some((m) => m.userId === user.userId);
  if (!isMember) return NextResponse.json({ error: "No tienes acceso a esta tarea" }, { status: 403 });

  const contentType = req.headers.get("content-type") || "";

  // Archivo grande ya subido a Vercel Blob: solo confirmamos y guardamos la URL.
  if (contentType.includes("application/json")) {
    const { url, filename, mimeType, size } = await req.json();
    if (!url || !filename) {
      return NextResponse.json({ error: "Faltan datos del archivo subido" }, { status: 400 });
    }
    const attachment = await prisma.attachment.create({
      data: {
        filename,
        mimeType: mimeType || "application/octet-stream",
        size: size || 0,
        url,
        taskId: params.id,
        uploadedById: user.userId
      },
      select: ATTACHMENT_LIST_SELECT
    });
    return NextResponse.json(attachment, { status: 201 });
  }

  // Ruta antigua: archivos chicos, guardados directamente como bytes.
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "El archivo supera los 5MB" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());

  const attachment = await prisma.attachment.create({
    data: {
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: buffer,
      taskId: params.id,
      uploadedById: user.userId
    },
    select: ATTACHMENT_LIST_SELECT
  });

  return NextResponse.json(attachment, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { project: { include: { members: true } } }
  });
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  const isMember =
    task.project.ownerId === user.userId || task.project.members.some((m) => m.userId === user.userId);
  if (!isMember) return NextResponse.json({ error: "No tienes acceso a esta tarea" }, { status: 403 });

  const attachments = await prisma.attachment.findMany({
    where: { taskId: params.id },
    select: ATTACHMENT_LIST_SELECT,
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(attachments);
}
