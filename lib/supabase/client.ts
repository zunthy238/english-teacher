// lib/supabase/client.ts
// Cliente de Supabase para componentes que corren en el navegador ("use client").
// Usa la llave publishable: es pública por diseño; la seguridad la da RLS.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
