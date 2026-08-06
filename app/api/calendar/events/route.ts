import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notifyCalendarInvite } from "@/lib/notify";

const EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  status: true,
  userId: true,
  respondedAt: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } }
} as const;

// Lista los eventos del calendario de un usuario. Por defecto, el propio;
// un administrador puede pedir el de cualquier otra persona (para ver su
// disponibilidad antes de agendarle algo).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const requestedUserId = req.nextUrl.searchParams.get("userId") || user.userId;
  if (requestedUserId !== user.userId && user.role !== "ADMIN") {
    return NextResponse.json({ error: "No tienes permiso para ver este calendario" }, { status: 403 });
  }

  const events = await prisma.calendarEvent.findMany({
    where: { userId: requestedUserId },
    select: EVENT_SELECT,
    orderBy: { startsAt: "asc" }
  });

  return NextResponse.json(
    events.map((e) => ({
      ...e,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
      respondedAt: e.respondedAt ? e.respondedAt.toISOString() : null,
      createdAt: e.createdAt.toISOString()
    }))
  );
}

// Crea un evento. Si es para uno mismo, queda aceptado al instante. Si un
// administrador lo agenda para otra persona, queda pendiente y esa persona
// recibe un aviso en su bandeja de entrada para aceptarlo o rechazarlo.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { userId, title, description, startsAt, endsAt } = await req.json();
  if (!title || !startsAt) {
    return NextResponse.json({ error: "El título y la fecha son obligatorios" }, { status: 400 });
  }

  const targetUserId = userId || user.userId;
  const isSelf = targetUserId === user.userId;
  if (!isSelf && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede agendarle una cita a otra persona" }, { status: 403 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      description: description || null,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      status: isSelf ? "ACCEPTED" : "PENDING",
      userId: targetUserId,
      createdById: user.userId
    },
    select: EVENT_SELECT
  });

  if (!isSelf) {
    await notifyCalendarInvite({
      userId: targetUserId,
      actorId: user.userId,
      actorName: user.name,
      eventTitle: title,
      startsAt: event.startsAt
    });
  }

  return NextResponse.json(
    {
      ...event,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt ? event.endsAt.toISOString() : null,
      respondedAt: event.respondedAt ? event.respondedAt.toISOString() : null,
      createdAt: event.createdAt.toISOString()
    },
    { status: 201 }
  );
}
