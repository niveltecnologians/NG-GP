import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canManageProjectReports, canManageSingleReport } from "@/lib/reportAccess";

async function loadReport(projectId: string, reportId: string) {
  const report = await prisma.progressReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      projectId: true,
      areaId: true,
      authorId: true,
      project: { select: { ownerId: true } }
    }
  });
  if (!report || report.projectId !== projectId) return null;
  return report;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; reportId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const report = await loadReport(params.id, params.reportId);
  if (!report) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  const accessUser = {
    userId: user.userId,
    role: user.role,
    areaId: user.areaId,
    seesAllAreas: user.seesAllAreas
  };

  if (!canManageSingleReport(report.project, accessUser, report)) {
    return NextResponse.json({ error: "No tienes acceso a este informe" }, { status: 403 });
  }

  const { title, body, reportDate, progress, status, areaId } = await req.json();

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
  // Solo quien administra el proyecto completo puede cambiarle el área a un
  // informe ya creado (para que un área no pueda "quitarle" un informe a
  // otra con solo editarlo).
  if (areaId !== undefined && canManageProjectReports(report.project, accessUser)) {
    data.areaId = areaId ? String(areaId) : null;
  }

  const updated = await prisma.progressReport.update({
    where: { id: params.reportId },
    data,
    include: {
      author: { select: { id: true, name: true } },
      area: { select: { id: true, name: true, colorKey: true } },
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

  const report = await loadReport(params.id, params.reportId);
  if (!report) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  const accessUser = {
    userId: user.userId,
    role: user.role,
    areaId: user.areaId,
    seesAllAreas: user.seesAllAreas
  };

  if (!canManageSingleReport(report.project, accessUser, report)) {
    return NextResponse.json({ error: "No tienes acceso a este informe" }, { status: 403 });
  }

  // Las fotos se borran solas por el onDelete: Cascade del esquema.
  await prisma.progressReport.delete({ where: { id: params.reportId } });
  return NextResponse.json({ ok: true });
}
