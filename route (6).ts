import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Autoriza la subida de las fotos del registro fotográfico directo del
// navegador a Vercel Blob, sin pasar por el límite de tamaño de las funciones
// serverless (~4.5MB). Es el mismo patrón de /api/blob/task-attachment: el
// registro en la base se crea aparte, en
// /api/projects/[id]/reports/[reportId]/photos, cuando la subida ya terminó.
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
        const reportId = clientPayload?.reportId as string | undefined;
        if (!reportId) throw new Error("Falta el informe de destino");

        const report = await prisma.progressReport.findUnique({
          where: { id: reportId },
          select: { project: { select: { ownerId: true } } }
        });
        if (!report) throw new Error("El informe no existe");
        if (report.project.ownerId !== user.userId && user.role !== "ADMIN") {
          throw new Error("No tienes acceso a este informe");
        }

        return {
          addRandomSuffix: true,
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"],
          maximumSizeInBytes: 25 * 1024 * 1024 // 25MB por foto
        };
      },
      onUploadCompleted: async () => {
        // Igual que con los adjuntos: el registro se crea explícitamente desde
        // el navegador, no por webhook (que no llega en desarrollo local).
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
