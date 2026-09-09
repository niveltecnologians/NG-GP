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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; reportId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const report = await assertCanWrite(params.id, params.reportId, user.userId, user.role);
  if (!report) return NextResponse.json({ error: "No tienes acceso a este informe" }, { status: 403 });

  const { title, body, reportDate, progress, status } = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof body === "string") data.body = body;
  if (reportDate) data.reportDate = new Date(reportDate);
  if (status === "DRAFT" || status === "PUBLISHED") data.status = status;
  if (progress !== undefined) {
    if (progress === null || progress === "") {
      data.progress = null;
    } else {
      const n = Math.max(0, Math.min(100, Math.round(Number(progress))));
      data.progress = Number.isNaN(n) ? null : n;
    }
  }

  const updated = await prisma.progressReport.update({
    where: { id: params.reportId },
    data,
    include: {
      author: { select: { id: true, name: true } },
      photos: { orderBy: { order: "asc" } }
    }
  });

  return NextResponse.json({
    ...updated,
    reportDate: updated.reportDate.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    photos: updated.photos.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; reportId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const report = await assertCanWrite(params.id, params.reportId, user.userId, user.role);
  if (!report) return NextResponse.json({ error: "No tienes acceso a este informe" }, { status: 403 });

  // Las fotos se borran solas por el onDelete: Cascade del esquema.
  await prisma.progressReport.delete({ where: { id: params.reportId } });
  return NextResponse.json({ ok: true });
}
