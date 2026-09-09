import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function assertCanWrite(photoId: string, userId: string, role: string) {
  const photo = await prisma.progressPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, report: { select: { project: { select: { ownerId: true } } } } }
  });
  if (!photo) return null;
  if (photo.report.project.ownerId !== userId && role !== "ADMIN") return null;
  return photo;
}

export async function PATCH(req: NextRequest, { params }: { params: { photoId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const photo = await assertCanWrite(params.photoId, user.userId, user.role);
  if (!photo) return NextResponse.json({ error: "No tienes acceso a esta foto" }, { status: 403 });

  const { caption } = await req.json();
  const updated = await prisma.progressPhoto.update({
    where: { id: params.photoId },
    data: { caption: caption ? String(caption) : null }
  });

  return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: { photoId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const photo = await assertCanWrite(params.photoId, user.userId, user.role);
  if (!photo) return NextResponse.json({ error: "No tienes acceso a esta foto" }, { status: 403 });

  await prisma.progressPhoto.delete({ where: { id: params.photoId } });
  return NextResponse.json({ ok: true });
}
