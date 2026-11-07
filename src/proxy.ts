import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/manager", "/inventory"];

// Coarse, cookie-only check (no DB call) — real role/permission enforcement
// still happens in GetSession()/CheckPermission() at the layout/page/API
// layer. This just avoids a flash of a protected page before that renders.
//
// Deliberately one-directional: only redirects unauthenticated requests
// AWAY from protected routes. Do not add a cookie-present check that
// redirects authenticated-looking requests away from /auth/* here — a
// stale/invalid cookie (present but not a valid session) would then
// disagree with the real DB-backed check in src/app/auth/layout.tsx,
// which already handles that redirect correctly, and the two checks
// fighting each other produces an infinite redirect loop. See
// docs/DECISIONS.md.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isProtected && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/manager/:path*", "/inventory/:path*"],
};
