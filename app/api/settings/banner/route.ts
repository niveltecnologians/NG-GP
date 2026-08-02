import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getAppSettings } from "@/lib/settings";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede cambiar la imagen" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se envió ninguna imagen" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "La imagen supera los 5MB" }, { status: 413 });

  await getAppSettings();
  const buffer = Buffer.from(await file.arrayBuffer());
  await prisma.appSettings.update({
    where: { id: "singleton" },
    data: { bannerData: buffer, bannerMimeType: file.type, hasBanner: true }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede cambiar la imagen" }, { status: 403 });
  }

  await getAppSettings();
  await prisma.appSettings.update({
    where: { id: "singleton" },
    data: { bannerData: null, bannerMimeType: null, hasBanner: false }
  });

  return NextResponse.json({ ok: true });
}
