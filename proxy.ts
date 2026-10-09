// proxy.ts (Next.js 16; antes se llamaba middleware.ts)
// Corre antes de cada página: renueva la sesión de Supabase y exige login.
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todo excepto archivos estáticos, íconos y el manifiesto de la PWA.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
