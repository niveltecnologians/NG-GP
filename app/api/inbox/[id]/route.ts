import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function assertAccess(ticketId: string, userId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return null;
  return ticket.senderId === userId || ticket.recipientId === userId ? ticket : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const ticket = await assertAccess(params.id, user.userId);
  if (!ticket) return NextResponse.json({ error: "Requerimiento no encontrado" }, { status: 404 });

  const full = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
      replies: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return NextResponse.json(full);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const ticket = await assertAccess(params.id, user.userId);
  if (!ticket) return NextResponse.json({ error: "Requerimiento no encontrado" }, { status: 404 });

  const { status } = await req.json();
  const updated = await prisma.ticket.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json(updated);
}
