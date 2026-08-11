import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/session";
import { assertTaskAccess } from "@/lib/taskAccess";

// Autoriza la subida de un archivo (grande) directo del navegador a Vercel
// Blob, sin pasar por el límite de tamaño de las funciones serverless de
// Vercel (~4.5MB). El registro en la base se crea aparte, en
// /api/tasks/[id]/attachments, una vez que la subida ya terminó.
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
        const taskId = clientPayload?.taskId as string | undefined;
        if (!taskId) throw new Error("Falta la tarea de destino");

        const task = await assertTaskAccess(taskId, user.userId, user.role);
        if (!task) throw new Error("No tienes acceso a esta tarea");

        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024 // 500MB
        };
      },
      onUploadCompleted: async () => {
        // No hacemos nada acá: el registro se crea de forma explícita desde
        // el navegador (más simple y confiable que depender del webhook,
        // que además no llega en desarrollo local).
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
