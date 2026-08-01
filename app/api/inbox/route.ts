import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Lista los tickets recibidos y enviados por el usuario (bandeja de entrada / enviados)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const box = req.nextUrl.searchParams.get("box") || "received"; // received | sent

  const tickets = await prisma.ticket.findMany({
    where: box === "sent" ? { senderId: user.userId } : { recipientId: user.userId },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
      _count: { select: { replies: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json(tickets);
}

// Crea un nuevo requerimiento y lo "envía" a otro usuario, como un correo
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { subject, body, recipientEmail } = await req.json();
  if (!subject || !body || !recipientEmail) {
    return NextResponse.json({ error: "Asunto, mensaje y destinatario son obligatorios" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { email: recipientEmail } });
  if (!recipient) return NextResponse.json({ error: "No existe un usuario con ese email" }, { status: 404 });

  const ticket = await prisma.ticket.create({
    data: { subject, body, senderId: user.userId, recipientId: recipient.id },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } }
    }
  });

  return NextResponse.json(ticket, { status: 201 });
}
