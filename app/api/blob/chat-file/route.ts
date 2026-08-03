import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayloadRaw) => {
        const user = await getCurrentUser();
        if (!user) throw new Error("No autenticado");

        const clientPayload = clientPayloadRaw ? JSON.parse(clientPayloadRaw) : null;
        const conversationId = clientPayload?.conversationId as string | undefined;
        if (!conversationId) throw new Error("Falta la conversación de destino");

        const membership = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId, userId: user.userId } }
        });
        if (!membership) throw new Error("No tienes acceso a esta conversación");

        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024 // 500MB
        };
      },
      onUploadCompleted: async () => {
        // El mensaje se crea explícitamente desde el navegador después de
        // que la subida termina (ver ChatThread/ThreadPanel).
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
