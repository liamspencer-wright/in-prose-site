import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // IndexNow key verification file — Bing + Yandex check ownership by fetching
  // https://inprose.co.uk/<INDEXNOW_KEY>.txt and expecting the same key body.
  const indexNowKey = process.env.INDEXNOW_KEY;
  if (
    indexNowKey &&
    request.nextUrl.pathname === `/${indexNowKey}.txt`
  ) {
    return new NextResponse(indexNowKey, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
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
