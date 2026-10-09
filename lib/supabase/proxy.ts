// lib/supabase/proxy.ts
// Se ejecuta en cada petición (desde proxy.ts): renueva la sesión y protege las páginas.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Redirige conservando las cookies de sesión recién renovadas.
function redirectTo(path: string, request: NextRequest, from: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const response = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims valida el token. No usar getSession() en el servidor: no revalida.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith("/login");
  const isApi = pathname.startsWith("/api"); // las rutas /api verifican la sesión por sí mismas (401)

  if (!isLoggedIn && !isLoginPage && !isApi) {
    return redirectTo("/login", request, supabaseResponse);
  }
  if (isLoggedIn && isLoginPage) {
    return redirectTo("/today", request, supabaseResponse);
  }

  return supabaseResponse;
}
