import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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

// Acepta/rechaza una cita pendiente (solo el dueño del calendario), o edita
// los datos del evento (dueño, quien lo creó, o cualquier administrador).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const event = await prisma.calendarEvent.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const isOwner = event.userId === user.userId;
  const isCreator = event.createdById === user.userId;
  const canManage = isOwner || isCreator || user.role === "ADMIN";
  if (!canManage) return NextResponse.json({ error: "No tienes permiso sobre este evento" }, { status: 403 });

  const body = await req.json();

  // Los datos de la cita (título, descripción, fecha) son compartidos: si la
  // cita se agendó para varias personas a la vez, editarla actualiza la
  // versión de todos los invitados. El estado (aceptar/rechazar) es siempre
  // individual, solo afecta la fila del dueño de ese calendario.
  const sharedData: Record<string, unknown> = {};
  if (body.title !== undefined) sharedData.title = body.title;
  if (body.description !== undefined) sharedData.description = body.description || null;
  if (body.startsAt !== undefined) sharedData.startsAt = new Date(body.startsAt);
  if (body.endsAt !== undefined) sharedData.endsAt = body.endsAt ? new Date(body.endsAt) : null;

  if (Object.keys(sharedData).length > 0) {
    if (event.groupId) {
      await prisma.calendarEvent.updateMany({ where: { groupId: event.groupId }, data: sharedData });
    } else {
      await prisma.calendarEvent.update({ where: { id: params.id }, data: sharedData });
    }
  }

  if (body.status !== undefined) {
    if (!isOwner) {
      return NextResponse.json({ error: "Solo el dueño del calendario puede aceptar o rechazar la cita" }, { status: 403 });
    }
    if (body.status !== "ACCEPTED" && body.status !== "DECLINED") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    await prisma.calendarEvent.update({
      where: { id: params.id },
      data: { status: body.status, respondedAt: new Date() }
    });
  }

  const updated = await prisma.calendarEvent.findUnique({ where: { id: params.id }, select: EVENT_SELECT });
  if (!updated) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  return NextResponse.json(serialize(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const event = await prisma.calendarEvent.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const canManage = event.userId === user.userId || event.createdById === user.userId || user.role === "ADMIN";
  if (!canManage) return NextResponse.json({ error: "No tienes permiso sobre este evento" }, { status: 403 });

  await prisma.calendarEvent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
