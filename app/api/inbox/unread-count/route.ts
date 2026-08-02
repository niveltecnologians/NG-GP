import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const tickets = await prisma.ticket.findMany({
    where: { OR: [{ recipientId: user.userId }, { senderId: user.userId }] },
    select: { id: true, senderId: true, recipientId: true, updatedAt: true, recipientReadAt: true, senderReadAt: true }
  });

  const count = tickets.filter((t) => {
    const readAt = t.recipientId === user.userId ? t.recipientReadAt : t.senderReadAt;
    return !readAt || readAt < t.updatedAt;
  }).length;

  return NextResponse.json({ count });
}
