import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getAppSettings } from "@/lib/settings";

const VALID_PROVIDERS = ["anthropic", "openai"];

// Solo dice si hay una IA conectada y cuál proveedor — nunca el API key.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede ver esto" }, { status: 403 });
  }

  const settings = await getAppSettings();
  return NextResponse.json({
    connected: !!(settings.aiProvider && settings.aiApiKey),
    provider: settings.aiProvider
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede cambiar la configuración" }, { status: 403 });
  }

  const { provider, apiKey } = await req.json();
  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Proveedor de IA no válido" }, { status: 400 });
  }
  if (!apiKey || !String(apiKey).trim()) {
    return NextResponse.json({ error: "Falta el API key" }, { status: 400 });
  }

  await getAppSettings(); // asegura que exista la fila
  await prisma.appSettings.update({
    where: { id: "singleton" },
    data: { aiProvider: provider, aiApiKey: String(apiKey).trim() }
  });

  return NextResponse.json({ connected: true, provider });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede cambiar la configuración" }, { status: 403 });
  }

  await getAppSettings();
  await prisma.appSettings.update({
    where: { id: "singleton" },
    data: { aiProvider: null, aiApiKey: null }
  });

  return NextResponse.json({ connected: false, provider: null });
}

