import { createServerClient } from "@supabase/ssr";
import { authCookie } from "./lib/supabase/cookie";
import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "./lib/auth/enabled";

/**
 * Runs before every page: hides sign-in in production (Technical Plan 12.1) and refreshes
 * the signed-in person's session so pages see a valid one.
 */
export async function proxy(request: NextRequest) {
  if (!authEnabled()) {
    if (request.nextUrl.pathname.startsWith("/auth"))
      return new NextResponse(null, { status: 404 });
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
    {
      ...authCookie(),
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet)
            response.cookies.set(name, value, options);
        },
      },
    },
  );
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Every page, but not static files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
