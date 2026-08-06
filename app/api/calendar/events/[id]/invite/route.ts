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

// Agrega más invitados a una cita ya creada (edición). Si la cita era para
// una sola persona, pasa a ser compartida (se le asigna un groupId nuevo);
// si ya era compartida, se suman a ese mismo grupo. Cada persona nueva
// recibe su propia fila con estado pendiente (o aceptada si es uno mismo) y
// un aviso en su bandeja de entrada.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const event = await prisma.calendarEvent.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const canManage = event.userId === user.userId || event.createdById === user.userId || user.role === "ADMIN";
  if (!canManage) return NextResponse.json({ error: "No tienes permiso sobre esta cita" }, { status: 403 });

  const body = await req.json();
  const newIds: string[] = Array.isArray(body.userIds) ? Array.from(new Set(body.userIds.filter(Boolean))) : [];
  if (newIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un invitado nuevo" }, { status: 400 });
  }

  const targetUsers = await prisma.user.findMany({ where: { id: { in: newIds } } });
  if (targetUsers.length !== newIds.length) {
    return NextResponse.json({ error: "Alguno de los usuarios seleccionados no existe" }, { status: 404 });
  }

  let groupId = event.groupId;
  if (!groupId) {
    groupId = randomUUID();
    await prisma.calendarEvent.update({ where: { id: event.id }, data: { groupId } });
  }

  const existing = await prisma.calendarEvent.findMany({ where: { groupId }, select: { userId: true } });
  const existingIds = new Set(existing.map((e) => e.userId));
  const toAdd = newIds.filter((id) => !existingIds.has(id));

  if (toAdd.length === 0) {
    return NextResponse.json({ error: "Esas personas ya estaban invitadas a esta cita" }, { status: 400 });
  }

  const created = await Promise.all(
    toAdd.map((targetUserId) => {
      const isSelf = targetUserId === user.userId;
      return prisma.calendarEvent.create({
        data: {
          title: event.title,
          description: event.description,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
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
          eventTitle: event.title,
          startsAt: e.startsAt
        })
      )
  );

  return NextResponse.json(created.map(serialize), { status: 201 });
}
