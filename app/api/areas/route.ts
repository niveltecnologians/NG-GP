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

// Cualquier usuario logueado puede ver la lista de áreas (la necesita para
// los selectores de tareas, usuarios e invitaciones). Solo un
// administrador puede crearlas, editarlas o borrarlas.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const areas = await prisma.area.findMany({
    select: AREA_SELECT,
    orderBy: { name: "asc" }
  });
  return NextResponse.json(areas);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede crear áreas" }, { status: 403 });
  }

  const { name, colorKey } = await req.json();
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "El nombre del área es obligatorio" }, { status: 400 });
  }

  const existing = await prisma.area.findUnique({ where: { name: trimmed } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un área con ese nombre" }, { status: 409 });
  }

  const created = await prisma.area.create({
    data: {
      name: trimmed,
      colorKey: VALID_COLOR_KEYS.includes(colorKey) ? colorKey : "slate"
    },
    select: AREA_SELECT
  });

  return NextResponse.json(created, { status: 201 });
}

