import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { PORTAL_COOKIE, signPortalSession } from "@/lib/clientPortal";

// El cliente manda su PIN y, si es correcto, se le deja una cookie de sesión
// de portal para que no lo tenga que escribir cada vez que entre.
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { pin } = await req.json();

  const access = await prisma.clientAccess.findUnique({
    where: { token: params.token },
    select: { id: true, projectId: true, active: true, pinHash: true }
  });

  if (!access || !access.active) {
    return NextResponse.json({ error: "Este enlace ya no está disponible" }, { status: 404 });
  }

  if (access.pinHash) {
    if (!pin) return NextResponse.json({ error: "Escribe tu PIN" }, { status: 400 });
    const valid = await verifyPassword(String(pin), access.pinHash);
    if (!valid) return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const token = await signPortalSession({ accessId: access.id, projectId: access.projectId });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}
