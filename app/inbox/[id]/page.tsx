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

  const serialized = {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    replies: ticket.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
  };

  return <ThreadView ticket={serialized} currentUserId={user.userId} />;
}
