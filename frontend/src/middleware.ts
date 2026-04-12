import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "deerflow_auth";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/register") return true;
  if (pathname.startsWith("/blog")) return true;
  if (/^\/[a-z]{2}\/docs/.test(pathname)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Same-origin /api/* is proxied to the gateway (or route handlers). Never treat as a page:
  // unauthenticated users must reach POST /api/auth/register without a session cookie.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.get(AUTH_COOKIE)?.value === "1";
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and Next internals.
     */
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
