import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Lista liviana de usuarios (id, nombre, email) para selects como
// "agregar miembro" o "asignar tarea". Accesible para cualquier usuario
// autenticado (no solo administradores), a diferencia de /api/users.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });
  return NextResponse.json(users);
}
