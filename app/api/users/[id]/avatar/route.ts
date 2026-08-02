import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Sirve la foto de perfil de cualquier usuario registrado (visible dentro
// de la app: navbar, chat, listas de miembros, etc.)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { avatarData: true, avatarMimeType: true }
  });
  if (!target || !target.avatarData || !target.avatarMimeType) {
    return NextResponse.json({ error: "Sin foto de perfil" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(target.avatarData), {
    headers: {
      "Content-Type": target.avatarMimeType,
      "Cache-Control": "private, max-age=300"
    }
  });
}
