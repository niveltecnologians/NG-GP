import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canCreateReportForArea, visibleProjectReports } from "@/lib/reportAccess";

// Cualquier miembro del proyecto puede leer los informes que le
// correspondan (ver visibleProjectReports); para crearlos hace falta poder
// administrar el proyecto completo, o tener asignada la misma área del
// informe que se quiere crear (ver canCreateReportForArea).
async function getProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, members: { select: { userId: true } } }
  });
  if (!project) return null;
  const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
  return { project, isMember };
}

const REPORT_INCLUDE = {
  author: { select: { id: true, name: true } },
  area: { select: { id: true, name: true, colorKey: true } },
  photos: { orderBy: { order: "asc" } }
} as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const found = await getProject(params.id, user.userId);
  if (!found || (!found.isMember && user.role !== "ADMIN" && user.role !== "GERENTE")) {
    return NextResponse.json({ error: "No tienes acceso a este proyecto" }, { status: 403 });
  }

  const reports = await prisma.progressReport.findMany({
    where: { projectId: params.id },
    include: REPORT_INCLUDE,
    orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }]
  });

  const visible = visibleProjectReports(reports, found.project, {
    userId: user.userId,
    role: user.role,
    areaId: user.areaId,
    seesAllAreas: user.seesAllAreas
  });

  return NextResponse.json(
    visible.map((r) => ({
      ...r,
      reportDate: r.reportDate.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      photos: r.photos.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))
    }))
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const found = await getProject(params.id, user.userId);
  if (!found || (!found.isMember && user.role !== "ADMIN" && user.role !== "GERENTE")) {
    return NextResponse.json({ error: "No tienes acceso a este proyecto" }, { status: 403 });
  }

  const { title, body, reportDate, progress, status, areaId } = await req.json();

  const reportAreaId = areaId ? String(areaId) : null;
  const canCreate = canCreateReportForArea(found.project, {
    userId: user.userId,
    role: user.role,
    areaId: user.areaId,
    seesAllAreas: user.seesAllAreas
  }, reportAreaId);

  if (!canCreate) {
    return NextResponse.json(
      { error: "No puedes crear un informe para esa área" },
      { status: 403 }
    );
  }

  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "El título del informe es obligatorio" }, { status: 400 });
  }

  if (reportAreaId) {
    const area = await prisma.area.findUnique({ where: { id: reportAreaId } });
    if (!area) return NextResponse.json({ error: "El área elegida no existe" }, { status: 400 });
  }

  const parsedProgress =
    progress === null || progress === undefined || progress === ""
      ? null
      : Math.max(0, Math.min(100, Math.round(Number(progress))));

  const report = await prisma.progressReport.create({
    data: {
      projectId: params.id,
      areaId: reportAreaId,
      title: String(title).trim(),
      body: typeof body === "string" ? body : "",
      reportDate: reportDate ? new Date(reportDate) : new Date(),
      progress: Number.isNaN(parsedProgress) ? null : parsedProgress,
      status: status === "DRAFT" ? "DRAFT" : "PUBLISHED",
      authorId: user.userId
    },
    include: REPORT_INCLUDE
  });

  return NextResponse.json(
    {
      ...report,
      reportDate: report.reportDate.toISOString(),
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      photos: []
    },
    { status: 201 }
  );
}
