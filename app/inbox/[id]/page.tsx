import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import ThreadView from "./ThreadView";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const user = await requireUser();

  const ticket = await prisma.ticket.findUnique({
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

  if (!ticket) notFound();
  if (ticket.senderId !== user.userId && ticket.recipientId !== user.userId) notFound();

  // Marca el hilo como leído para la parte que corresponda (se usa para el
  // contador de no leídos de la bandeja de entrada). Se fija explícitamente
  // "updatedAt" con su mismo valor anterior para que este cambio no cuente
  // como una actualización nueva del ticket (si no, Prisma la actualiza
  // sola en cada guardado y el ticket parecería "no leído" otra vez).
  if (ticket.recipientId === user.userId) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { recipientReadAt: new Date(), updatedAt: ticket.updatedAt }
    });
  } else if (ticket.senderId === user.userId) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { senderReadAt: new Date(), updatedAt: ticket.updatedAt }
    });
  }

  const serialized = {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    replies: ticket.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
  };

  return <ThreadView ticket={serialized} currentUserId={user.userId} />;
}
