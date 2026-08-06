import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Cuántas citas me agendaron y todavía no acepté ni rechacé (para el
// contador de "Calendario" en el menú de arriba).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const count = await prisma.calendarEvent.count({
    where: { userId: user.userId, status: "PENDING" }
  });

  return NextResponse.json({ count });
}
