import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { signSession, SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const profile = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bio: true,
      hasAvatar: true,
      backgroundColor: true,
      hasBackgroundImage: true,
      createdAt: true
    }
  });
  if (!profile) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json({ ...profile, createdAt: profile.createdAt.toISOString() });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { name, bio } = await req.json();
  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    data.name = name.trim();
  }
  if (bio !== undefined) data.bio = bio.slice(0, 500);

  const updated = await prisma.user.update({
    where: { id: user.userId },
    data,
    select: { id: true, name: true, email: true, role: true, bio: true }
  });

  const res = NextResponse.json(updated);
  if (data.name) {
    // Refresca la cookie de sesión para que el nombre nuevo se vea de inmediato en el navbar.
    const token = await signSession({ userId: updated.id, email: updated.email, name: updated.name, role: updated.role });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
  }
  return res;
}
