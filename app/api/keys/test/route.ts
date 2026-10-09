// app/api/keys/test/route.ts
// "Probar mi key": recorre el mismo camino que usará la IA (CP-3):
// sesión → cuota → descifrar key → llamar al proveedor (llamada gratuita).
import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { resolveKey } from "@/lib/keys";
import { consumeRequest } from "@/lib/quota";
import { validateProviderKey } from "@/lib/providers";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST() {
  const userId = await getUserId();
  if (!userId) return json({ error: "Inicia sesión para continuar." }, 401);

  const quota = await consumeRequest(userId);
  if (!quota.allowed) {
    return json(
      { error: `Llegaste al límite de ${quota.limit} solicitudes de hoy. Se reinicia a medianoche.`, ...quota },
      429,
    );
  }

  const key = await resolveKey(userId);
  if (!key) return json({ error: "Primero registra una API key.", ...quota }, 404);

  const check = await validateProviderKey(key.provider, key.apiKey);
  if (!check.ok) return json({ error: check.error, ...quota }, 400);

  return json({ ok: true, provider: key.provider, warning: check.warning, ...quota });
}
