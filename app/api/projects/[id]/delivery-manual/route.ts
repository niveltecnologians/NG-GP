import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canManageProjectReports } from "@/lib/reportAccess";
import { getAiConfig } from "@/lib/settings";
import { generateDeliveryManualContent } from "@/lib/deliveryManual";

async function getProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, ownerId: true, members: { select: { userId: true } } }
  });
  if (!project) return null;
  const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
  return { project, isMember };
}

// Cualquier miembro del proyecto puede ver el manual de entrega ya
// generado (es el mismo documento global que después ve el cliente); solo
// quien administra el proyecto completo puede generarlo, regenerarlo o
// borrarlo (ver POST y DELETE más abajo).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const found = await getProject(params.id, user.userId);
  if (!found || (!found.isMember && user.role !== "ADMIN" && user.role !== "GERENTE")) {
    return NextResponse.json({ error: "No tienes acceso a este proyecto" }, { status: 403 });
  }

  const manual = await prisma.deliveryManual.findUnique({ where: { projectId: params.id } });
  if (!manual) return NextResponse.json(null);

  return NextResponse.json({
    content: manual.content,
    usedAI: manual.usedAI,
    updatedAt: manual.updatedAt.toISOString()
  });
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const found = await getProject(params.id, user.userId);
  if (!found) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const canGenerate = canManageProjectReports(found.project, {
    userId: user.userId,
    role: user.role,
    areaId: user.areaId,
    seesAllAreas: user.seesAllAreas
  });
  if (!canGenerate) {
    return NextResponse.json(
      { error: "Solo el dueño del proyecto, un administrador o el gerente pueden generar el manual de entrega" },
      { status: 403 }
    );
  }

  const reports = await prisma.progressReport.findMany({
    where: { projectId: params.id, status: "PUBLISHED" },
    select: {
      title: true,
      body: true,
      reportDate: true,
      progress: true,
      area: { select: { name: true } },
      photos: { select: { url: true, filename: true, caption: true }, orderBy: { order: "asc" } }
    },
    orderBy: { reportDate: "asc" }
  });

  const ai = await getAiConfig();
  const result = await generateDeliveryManualContent(
    found.project.name,
    reports.map((r) => ({
      areaName: r.area?.name ?? null,
      title: r.title,
      body: r.body,
      reportDate: r.reportDate,
      progress: r.progress,
      photos: r.photos
    })),
    ai
  );

  const manual = await prisma.deliveryManual.upsert({
    where: { projectId: params.id },
    create: {
      projectId: params.id,
      content: result.content,
      usedAI: result.usedAI,
      generatedById: user.userId
    },
    update: {
      content: result.content,
      usedAI: result.usedAI,
      generatedById: user.userId
    }
  });

  return NextResponse.json({
    content: manual.content,
    usedAI: manual.usedAI,
    updatedAt: manual.updatedAt.toISOString(),
    aiError: result.aiError
  });
}

// Borra el manual de entrega de este proyecto. El cliente deja de ver esa
// pestaña en su portal (la consulta ahí simplemente no encuentra nada)
// hasta que alguien genere uno nuevo.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const found = await getProject(params.id, user.userId);
  if (!found) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const canGenerate = canManageProjectReports(found.project, {
    userId: user.userId,
    role: user.role,
    areaId: user.areaId,
    seesAllAreas: user.seesAllAreas
  });
  if (!canGenerate) {
    return NextResponse.json(
      { error: "Solo el dueño del proyecto, un administrador o el gerente pueden borrar el manual de entrega" },
      { status: 403 }
    );
  }

  await prisma.deliveryManual.deleteMany({ where: { projectId: params.id } });

  return NextResponse.json({ ok: true });
}
