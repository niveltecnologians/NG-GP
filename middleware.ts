import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/inbox", "/reports", "/users", "/profile", "/chat", "/settings", "/calendar"];
const AUTH_PAGES = ["/login", "/register"];
const SESSION_COOKIE = "session_token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/inbox/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/profile/:path*",
    "/chat/:path*",
    "/settings/:path*",
    "/calendar/:path*",
    "/login",
    "/register"
  ]
};
