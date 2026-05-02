import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  authenticateAdmin,
  createSessionToken,
  isAuthConfigured,
  normalizeRedirectPath,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = normalizeRedirectPath(String(formData.get("redirectTo") ?? "/map"));

  if (!isAuthConfigured()) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "config");
    url.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(url);
  }

  const authenticated = await authenticateAdmin(username, password);
  if (!authenticated) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "invalid");
    url.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: await createSessionToken(username),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}