import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function assertCanWrite(projectId: string, reportId: string, userId: string, role: string) {
  const report = await prisma.progressReport.findUnique({
    where: { id: reportId },
    select: { id: true, projectId: true, project: { select: { ownerId: true } } }
  });
  if (!report || report.projectId !== projectId) return null;
  if (report.project.ownerId !== userId && role !== "ADMIN") return null;
  return report;
}

// Registra de una vez todas las fotos que el navegador ya terminó de subir a
// Vercel Blob (carga masiva: uno escoge 5, 10 o 30 fotos y quedan todas
// pegadas al mismo informe, en el orden en que se escogieron).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; reportId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const report = await assertCanWrite(params.id, params.reportId, user.userId, user.role);
  if (!report) return NextResponse.json({ error: "No tienes acceso a este informe" }, { status: 403 });

  const payload = await req.json();
  const photos = Array.isArray(payload?.photos) ? payload.photos : [];
  if (photos.length === 0) {
    return NextResponse.json({ error: "No se envió ninguna foto" }, { status: 400 });
  }

  // Las fotos nuevas se agregan al final, sin tocar las que ya estaban.
  const last = await prisma.progressPhoto.findFirst({
    where: { reportId: params.reportId },
    orderBy: { order: "desc" },
    select: { order: true }
  });
  let order = (last?.order ?? -1) + 1;

  const created = [];
  for (const photo of photos) {
    if (!photo?.url || !photo?.filename) continue;
    const row = await prisma.progressPhoto.create({
      data: {
        reportId: params.reportId,
        url: String(photo.url),
        filename: String(photo.filename),
        caption: photo.caption ? String(photo.caption) : null,
        order: order++
      }
    });
    created.push({ ...row, createdAt: row.createdAt.toISOString() });
  }

  if (created.length === 0) {
    return NextResponse.json({ error: "Faltan datos de las fotos subidas" }, { status: 400 });
  }

  return NextResponse.json(created, { status: 201 });
}
