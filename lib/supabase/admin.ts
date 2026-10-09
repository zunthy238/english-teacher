// lib/supabase/admin.ts
// Cliente con la llave SECRETA: ignora RLS. Solo servidor, solo para tareas controladas
// (bóveda de keys, cuota). "server-only" rompe la compilación si se importa en el navegador.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Falta SUPABASE_SECRET_KEY en el entorno del servidor.");
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
