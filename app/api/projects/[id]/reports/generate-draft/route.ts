import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canCreateReportForArea } from "@/lib/reportAccess";
import { getAiConfig } from "@/lib/settings";
import { generateReportDraft } from "@/lib/reportDraft";

async function getProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, ownerId: true, members: { select: { userId: true } } }
  });
  if (!project) return null;
  const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
  return { project, isMember };
}

// Redacta con IA un borrador del cuerpo de un informe NUEVO, antes de
// guardarlo (esta ruta no toca la base de datos, solo devuelve texto). Usa
// el mismo permiso que crear el informe de verdad: hace falta poder
// administrar el proyecto, o tener asignada esa misma área.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const found = await getProject(params.id, user.userId);
  if (!found || (!found.isMember && user.role !== "ADMIN" && user.role !== "GERENTE")) {
    return NextResponse.json({ error: "No tienes acceso a este proyecto" }, { status: 403 });
  }

  const { title, areaId, progress, date, notes } = await req.json();

  const reportAreaId = areaId ? String(areaId) : null;
  const canCreate = canCreateReportForArea(
    found.project,
    { userId: user.userId, role: user.role, areaId: user.areaId, seesAllAreas: user.seesAllAreas },
    reportAreaId
  );
  if (!canCreate) {
    return NextResponse.json({ error: "No puedes crear un informe para esa área" }, { status: 403 });
  }

  const ai = await getAiConfig();
  if (!ai) {
    return NextResponse.json(
      { error: "No hay ninguna IA conectada. Ve a Configuración → Conectar a IA para poder usar esta opción." },
      { status: 400 }
    );
  }

  let areaName: string | null = null;
  if (reportAreaId) {
    const area = await prisma.area.findUnique({ where: { id: reportAreaId }, select: { name: true } });
    areaName = area?.name ?? null;
  }

  const parsedProgress =
    progress === null || progress === undefined || progress === ""
      ? null
      : Math.max(0, Math.min(100, Math.round(Number(progress))));

  try {
    const text = await generateReportDraft(
      {
        projectName: found.project.name,
        title: title && String(title).trim() ? String(title).trim() : "Informe de avance",
        areaName,
        progress: Number.isNaN(parsedProgress) ? null : parsedProgress,
        date: date ? new Date(date) : new Date(),
        notes: typeof notes === "string" ? notes.trim() : ""
      },
      ai
    );
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo generar el informe con IA" },
      { status: 502 }
    );
  }
}

