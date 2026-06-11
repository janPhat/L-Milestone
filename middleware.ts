import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// OPTIMISTIC cookie check only — middleware runs on the edge and cannot reach
// D1, and OpenNext does not run Node middleware. Real enforcement lives in the
// DAL (src/lib/dal.ts) used by Server Components / Route Handlers.
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
