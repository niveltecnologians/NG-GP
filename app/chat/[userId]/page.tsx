import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import ChatThread from "@/components/ChatThread";

export default async function ChatWithUserPage({ params }: { params: { userId: string } }) {
  const user = await requireUser();
  if (params.userId === user.userId) notFound();

  const other = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, email: true, bio: true, hasAvatar: true }
  });
  if (!other) notFound();

  return <ChatThread currentUserId={user.userId} other={other} />;
}
