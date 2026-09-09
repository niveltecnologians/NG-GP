import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Cualquier miembro del proyecto puede leer los informes; para crearlos hay
// que ser dueño del proyecto o administrador (es lo que ve el cliente).
async function getAccess(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, members: { select: { userId: true } } }
  });
  if (!project) return { canRead: false, canWrite: false };
  const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
  const canWrite = project.ownerId === userId || role === "ADMIN";
  return { canRead: isMember || role === "ADMIN", canWrite };
}

const REPORT_INCLUDE = {
  author: { select: { id: true, name: true } },
  photos: { orderBy: { order: "asc" } }
} as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { canRead } = await getAccess(params.id, user.userId, user.role);
  if (!canRead) return NextResponse.json({ error: "No tienes acceso a este proyecto" }, { status: 403 });

  const reports = await prisma.progressReport.findMany({
    where: { projectId: params.id },
    include: REPORT_INCLUDE,
    orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json(
    reports.map((r) => ({
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

  const { canWrite } = await getAccess(params.id, user.userId, user.role);
  if (!canWrite) {
    return NextResponse.json({ error: "Solo el dueño del proyecto puede publicar informes" }, { status: 403 });
  }

  const { title, body, reportDate, progress, status } = await req.json();
  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "El título del informe es obligatorio" }, { status: 400 });
  }

  const parsedProgress =
    progress === null || progress === undefined || progress === ""
      ? null
      : Math.max(0, Math.min(100, Math.round(Number(progress))));

  const report = await prisma.progressReport.create({
    data: {
      projectId: params.id,
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
