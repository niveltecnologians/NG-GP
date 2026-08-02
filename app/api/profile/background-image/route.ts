import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Sirve la imagen de fondo del usuario que tiene la sesión abierta (privada,
// solo la ve quien la subió, aplicada como fondo de su propia pantalla).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { backgroundData: true, backgroundMimeType: true }
  });
  if (!me || !me.backgroundData || !me.backgroundMimeType) {
    return NextResponse.json({ error: "Sin imagen de fondo" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(me.backgroundData), {
    headers: {
      "Content-Type": me.backgroundMimeType,
      "Cache-Control": "private, max-age=300"
    }
  });
}
