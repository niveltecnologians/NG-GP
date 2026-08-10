import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PHASE_LABELS, AREA_LABELS, TaskPhase, TaskArea } from "@/lib/types";

function findEnumKeyByLabel<T extends string>(labels: Record<T, string>, value: unknown): T | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const normalized = value.trim().toLowerCase();
  const entry = (Object.entries(labels) as [T, string][]).find(([, label]) => label.toLowerCase() === normalized);
  return entry?.[0];
}

function parseBudget(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) && cleaned !== "" ? num : null;
}

// Recibe el .xlsx (subido con la plantilla de /budget-template, editada) y
// carga el presupuesto —y, si vienen, la fase y el área— de cada actividad
// automáticamente, emparejando las filas por la columna "ID".
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { members: true, tasks: { select: { id: true } } }
  });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const isMember = project.ownerId === user.userId || project.members.some((m) => m.userId === user.userId);
  if (!isMember) return NextResponse.json({ error: "No perteneces a este proyecto" }, { status: 403 });

  const validTaskIds = new Set(project.tasks.map((t) => t.id));

  const bytes = await req.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: "array" });
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo. ¿Es un .xlsx válido?" }, { status: 400 });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const id = row["ID (no modificar)"] ?? row["ID"];
    if (typeof id !== "string" || !validTaskIds.has(id)) {
      skipped++;
      continue;
    }

    const data: Record<string, unknown> = {};
    const budget = parseBudget(row["Presupuesto (COP)"]);
    data.budget = budget;

    const phaseKey = findEnumKeyByLabel<TaskPhase>(PHASE_LABELS, row["Fase"]);
    if (phaseKey) data.phase = phaseKey;

    const areaKey = findEnumKeyByLabel<TaskArea>(AREA_LABELS, row["Área"]);
    if (areaKey) data.area = areaKey;

    try {
      await prisma.task.update({ where: { id }, data });
      updated++;
    } catch {
      errors.push(`No se pudo actualizar la actividad "${row["Actividad"] || id}"`);
    }
  }

  return NextResponse.json({ updated, skipped, errors });
}
