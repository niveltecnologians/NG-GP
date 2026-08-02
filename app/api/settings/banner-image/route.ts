import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pública: se usa en las pantallas de login/registro, sin sesión.
export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.bannerData || !settings.bannerMimeType) {
    return NextResponse.json({ error: "Sin imagen configurada" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(settings.bannerData), {
    headers: { "Content-Type": settings.bannerMimeType, "Cache-Control": "public, max-age=300" }
  });
}
