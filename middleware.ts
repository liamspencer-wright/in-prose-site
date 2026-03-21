import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Rewrite /@username to /u/username
  const match = request.nextUrl.pathname.match(/^\/@([^/]+)(\/.*)?$/);
  if (match) {
    const url = request.nextUrl.clone();
    url.pathname = `/u/${match[1]}${match[2] ?? ""}`;
    return NextResponse.rewrite(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
