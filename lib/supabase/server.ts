// lib/supabase/server.ts
// Cliente de Supabase para el servidor (Server Components, Server Actions, rutas /api).
// Lee la sesión del usuario desde las cookies: toda consulta respeta RLS.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // En Server Components no se pueden escribir cookies.
            // Es seguro ignorarlo: proxy.ts renueva la sesión en cada petición.
          }
        },
      },
    },
  );
}
