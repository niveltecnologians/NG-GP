import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const memberships = await prisma.conversationMember.findMany({
    where: { userId: user.userId },
    select: { conversationId: true, lastReadAt: true }
  });

  const counts = await Promise.all(
    memberships.map((m) =>
      prisma.chatMessage.count({
        where: {
          conversationId: m.conversationId,
          senderId: { not: user.userId },
          createdAt: { gt: m.lastReadAt || new Date(0) }
        }
      })
    )
  );

  const count = counts.reduce((sum, c) => sum + c, 0);
  return NextResponse.json({ count });
}
