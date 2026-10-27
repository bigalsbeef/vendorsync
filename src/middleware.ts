import { NextResponse, type NextRequest } from "next/server";

// Cheap cookie check; the app layout does the real session lookup.
export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get("vendorsync_session")?.value);
  const { pathname } = req.nextUrl;
  const protectedPrefixes = ["/dashboard", "/customers", "/portals", "/documents", "/invoices", "/payments", "/settings"];
  if (!hasSession && protectedPrefixes.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|api|favicon.ico).*)"] };
