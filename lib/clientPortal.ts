import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";

// Sesión del portal del cliente. Es aparte de la sesión normal del equipo
// (lib/auth.ts) a propósito: un cliente que abre su enlace NO queda logueado
// en la plataforma, solo queda habilitado para ver su propio portal.

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const PORTAL_COOKIE = "portal_session";

export interface PortalSession {
  accessId: string;
  projectId: string;
}

// Token del enlace: 32 bytes aleatorios en base64url (~43 caracteres). No se
// puede adivinar y no depende de datos del proyecto.
export function generatePortalToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function signPortalSession(payload: PortalSession) {
  return new SignJWT({ ...payload, kind: "portal" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export async function verifyPortalSession(token: string): Promise<PortalSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    // Se verifica "kind" para que una sesión normal del equipo no sirva como
    // sesión de portal, ni al revés.
    if (payload.kind !== "portal") return null;
    return { accessId: payload.accessId as string, projectId: payload.projectId as string };
  } catch {
    return null;
  }
}

// Arma la URL completa que se le manda al cliente. Usa la variable de entorno
// del sitio si existe; si no, la que Vercel inyecta sola en cada despliegue.
export function buildPortalUrl(token: string, origin?: string): string {
  const base =
    origin ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return `${base.replace(/\/$/, "")}/portal/${token}`;
}
