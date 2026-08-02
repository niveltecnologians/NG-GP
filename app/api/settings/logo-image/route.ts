import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pública: la necesita el navbar y las pantallas de login/registro sin sesión.
export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.logoData || !settings.logoMimeType) {
    return NextResponse.json({ error: "Sin logo configurado" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(settings.logoData), {
    headers: { "Content-Type": settings.logoMimeType, "Cache-Control": "public, max-age=300" }
  });
}
