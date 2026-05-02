import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  DEFAULT_PROTECTED_REDIRECT,
  SESSION_COOKIE_NAME,
  isProtectedApiPath,
  isProtectedAppPath,
  normalizeRedirectPath,
  verifySessionToken,
} from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname === "/login") {
    if (session) {
      const redirectTo = normalizeRedirectPath(request.nextUrl.searchParams.get("redirect"));
      return NextResponse.redirect(new URL(redirectTo || DEFAULT_PROTECTED_REDIRECT, request.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedAppPath(pathname) && !isProtectedApiPath(pathname)) {
    return NextResponse.next();
  }

  if (session) {
    return NextResponse.next();
  }

  if (isProtectedApiPath(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/login", "/map", "/conditions", "/observations", "/reports", "/api/observations/submit", "/api/sherpai/:path*"],
};