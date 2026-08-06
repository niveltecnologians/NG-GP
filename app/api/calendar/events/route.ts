import { randomUUID } from "crypto";
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
  groupId: true,
  createdBy: { select: { id: true, name: true } }
} as const;

function serialize<T extends { startsAt: Date; endsAt: Date | null; respondedAt: Date | null; createdAt: Date }>(e: T) {
  return {
    ...e,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    respondedAt: e.respondedAt ? e.respondedAt.toISOString() : null,
    createdAt: e.createdAt.toISOString()
  };
}

// Lista los eventos del calendario de un usuario. Por defecto, el propio;
// cualquier persona del equipo puede pedir el de cualquier otra (para ver
// su disponibilidad antes de agendarle algo).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const requestedUserId = req.nextUrl.searchParams.get("userId") || user.userId;

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

// Crea un evento, para una o varias personas a la vez. Cada persona recibe
// su propia fila (para poder aceptar/rechazar por separado); si son varias,
// comparten un groupId para poder editarlas juntas después. Para uno mismo
// queda aceptada al instante; para cualquier otra persona (no hace falta
// ser administrador) queda pendiente y le llega un aviso a su bandeja de
// entrada para aceptarla o rechazarla.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const { title, description, startsAt, endsAt } = body;
  if (!title || !startsAt) {
    return NextResponse.json({ error: "El título y la fecha son obligatorios" }, { status: 400 });
  }

  const rawIds: string[] =
    Array.isArray(body.userIds) && body.userIds.length > 0 ? body.userIds : [body.userId || user.userId];
  const targetUserIds = Array.from(new Set(rawIds.filter(Boolean)));
  if (targetUserIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un invitado" }, { status: 400 });
  }

  const targetUsers = await prisma.user.findMany({ where: { id: { in: targetUserIds } } });
  if (targetUsers.length !== targetUserIds.length) {
    return NextResponse.json({ error: "Alguno de los usuarios seleccionados no existe" }, { status: 404 });
  }

  const groupId = targetUserIds.length > 1 ? randomUUID() : null;

  const created = await Promise.all(
    targetUserIds.map((targetUserId) => {
      const isSelf = targetUserId === user.userId;
      return prisma.calendarEvent.create({
        data: {
          title,
          description: description || null,
          startsAt: new Date(startsAt),
          endsAt: endsAt ? new Date(endsAt) : null,
          status: isSelf ? "ACCEPTED" : "PENDING",
          userId: targetUserId,
          createdById: user.userId,
          groupId
        },
        select: EVENT_SELECT
      });
    })
  );

  await Promise.all(
    created
      .filter((e) => e.userId !== user.userId)
      .map((e) =>
        notifyCalendarInvite({
          userId: e.userId,
          actorId: user.userId,
          actorName: user.name,
          eventTitle: title,
          startsAt: e.startsAt
        })
      )
  );

  return NextResponse.json(created.map(serialize), { status: 201 });
}
