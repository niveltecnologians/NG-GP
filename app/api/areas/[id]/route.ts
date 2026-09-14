import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Paleta fija de colores disponible para un área (ver lib/types.ts,
// AreaColorKey). Debe mantenerse igual a esa lista.
const VALID_COLOR_KEYS = [
  "yellow",
  "red",
  "blue",
  "green",
  "purple",
  "orange",
  "pink",
  "teal",
  "cyan",
  "slate"
];

const AREA_SELECT = {
  id: true,
  name: true,
  colorKey: true
} as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede editar áreas" }, { status: 403 });
  }

  const target = await prisma.area.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });

  const { name, colorKey } = await req.json();
  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) return NextResponse.json({ error: "El nombre del área no puede estar vacío" }, { status: 400 });
    if (trimmed !== target.name) {
      const existing = await prisma.area.findUnique({ where: { name: trimmed } });
      if (existing) return NextResponse.json({ error: "Ya existe un área con ese nombre" }, { status: 409 });
    }
    data.name = trimmed;
  }

  if (colorKey !== undefined) {
    data.colorKey = VALID_COLOR_KEYS.includes(colorKey) ? colorKey : target.colorKey;
  }

  const updated = await prisma.area.update({
    where: { id: params.id },
    data,
    select: AREA_SELECT
  });

  return NextResponse.json(updated);
}

// Al borrar un área, los usuarios/tareas/invitaciones que la tenían
// asignada simplemente quedan sin área (onDelete: SetNull en el schema),
// no se borra nada más.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede eliminar áreas" }, { status: 403 });
  }

  const target = await prisma.area.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });

  await prisma.area.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

