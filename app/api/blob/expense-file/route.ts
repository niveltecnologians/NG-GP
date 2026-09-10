import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Autoriza la subida del comprobante de un gasto (factura o cuenta de
// cobro) directo del navegador a Vercel Blob, sin pasar por el límite de
// tamaño de las funciones serverless (~4.5MB). Mismo patrón de
// /api/blob/report-photo y /api/blob/task-attachment: el registro del
// gasto se crea aparte, en /api/projects/[id]/expenses, cuando la subida
// ya terminó.
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
        const projectId = clientPayload?.projectId as string | undefined;
        if (!projectId) throw new Error("Falta el proyecto de destino");

        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { ownerId: true, members: { select: { userId: true } } }
        });
        if (!project) throw new Error("El proyecto no existe");
        const isMember =
          project.ownerId === user.userId || project.members.some((m) => m.userId === user.userId);
        if (!isMember) throw new Error("No tienes acceso a este proyecto");

        return {
          addRandomSuffix: true,
          allowedContentTypes: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "application/xml",
            "text/xml"
          ],
          maximumSizeInBytes: 20 * 1024 * 1024 // 20MB por comprobante
        };
      },
      onUploadCompleted: async () => {
        // No hacemos nada acá: el registro se crea de forma explícita desde
        // el navegador, no por webhook (que no llega en desarrollo local).
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

