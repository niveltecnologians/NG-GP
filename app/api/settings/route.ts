import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getAppSettings } from "@/lib/settings";

// Pública a propósito: hasta la pantalla de login (sin sesión) necesita
// saber el nombre y si hay logo para mostrarlos.
export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json({
    appName: settings.appName,
    hasLogo: settings.hasLogo,
    hasBanner: settings.hasBanner
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede cambiar la configuración" }, { status: 403 });
  }

  const { appName } = await req.json();
  if (!appName || !appName.trim()) {
    return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
  }

  await getAppSettings(); // asegura que exista la fila
  const updated = await prisma.appSettings.update({
    where: { id: "singleton" },
    data: { appName: appName.trim().slice(0, 60) }
  });

  return NextResponse.json({ appName: updated.appName });
}
