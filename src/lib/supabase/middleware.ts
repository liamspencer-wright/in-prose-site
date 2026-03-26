import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/library",
  "/search",
  "/friends",
  "/feed",
  "/settings",
  "/signup/profile",
];

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session (important for server components)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    const originalPath = request.nextUrl.pathname;
    url.pathname = "/login";
    url.searchParams.set("next", originalPath);

    // Add contextual message based on the route
    const messages: Record<string, string> = {
      "/library": "Log in to access your library",
      "/search": "Log in to search and add books",
      "/friends": "Log in to see your friends",
      "/feed": "Log in to view your feed",
      "/settings": "Log in to access settings",
      "/contact": "Log in to contact us",
      "/account": "Log in to access your account",
    };
    const message = Object.entries(messages).find(([route]) =>
      originalPath.startsWith(route)
    )?.[1];
    if (message) {
      url.searchParams.set("message", message);
    }

    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages (login/signup)
  const isAuthRoute = AUTH_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
