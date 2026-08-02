import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Guarda un color plano de fondo (limpia cualquier imagen previa).
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { color } = await req.json();
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return NextResponse.json({ error: "Color inválido" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.userId },
    data: {
      backgroundColor: color || null,
      backgroundData: null,
      backgroundMimeType: null,
      hasBackgroundImage: false
    }
  });

  return NextResponse.json({ ok: true });
}

// Sube una imagen de fondo (limpia el color plano previo).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se envió ninguna imagen" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "La imagen supera los 5MB" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  await prisma.user.update({
    where: { id: user.userId },
    data: {
      backgroundData: buffer,
      backgroundMimeType: file.type,
      hasBackgroundImage: true,
      backgroundColor: null
    }
  });

  return NextResponse.json({ ok: true });
}

// Quita cualquier personalización y vuelve al fondo por defecto.
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.userId },
    data: { backgroundColor: null, backgroundData: null, backgroundMimeType: null, hasBackgroundImage: false }
  });

  return NextResponse.json({ ok: true });
}
