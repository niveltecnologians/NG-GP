import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import ChatThread from "@/components/ChatThread";

// Nota: la carpeta se llama "[userId]" por razones históricas, pero el
// parámetro que recibe ahora es el id de una conversación (1 a 1 o grupal).
export default async function ChatConversationPage({ params }: { params: { userId: string } }) {
  const user = await requireUser();
  const conversationId = params.userId;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.userId } }
  });
  if (!membership) notFound();

  return (
    <Suspense fallback={<div className="card flex h-[calc(100vh-140px)] items-center justify-center text-sm text-slate-400">Cargando...</div>}>
      <ChatThread conversationId={conversationId} currentUserId={user.userId} />
    </Suspense>
  );
}
