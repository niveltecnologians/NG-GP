import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Requerimiento no encontrado" }, { status: 404 });
  if (ticket.senderId !== user.userId && ticket.recipientId !== user.userId) {
    return NextResponse.json({ error: "No tienes acceso a este requerimiento" }, { status: 403 });
  }

  const { body } = await req.json();
  if (!body) return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });

  const reply = await prisma.ticketReply.create({
    data: { body, ticketId: params.id, authorId: user.userId },
    include: { author: { select: { id: true, name: true, email: true } } }
  });

  await prisma.ticket.update({
    where: { id: params.id },
    data: {
      updatedAt: new Date(),
      status: ticket.status === "CLOSED" ? "OPEN" : ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status
    }
  });

  return NextResponse.json(reply, { status: 201 });
}
