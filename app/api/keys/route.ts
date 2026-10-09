// app/api/keys/route.ts
// GET: estado de las keys y cuota · POST: validar + cifrar + guardar · DELETE: borrar.
// Ninguna respuesta incluye la key: solo proveedor, últimos 4 caracteres y fecha.
import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { isProvider, parseKeyInput } from "@/lib/keys-input";
import { deleteKey, getKeyStatus, saveKey } from "@/lib/keys";
import { getUsage } from "@/lib/quota";
import { validateProviderKey } from "@/lib/providers";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const UNAUTHORIZED = { error: "Inicia sesión para continuar." };

export async function GET() {
  const userId = await getUserId();
  if (!userId) return json(UNAUTHORIZED, 401);
  try {
    const [keys, usage] = await Promise.all([getKeyStatus(userId), getUsage(userId)]);
    return json({ keys, usage });
  } catch {
    return json({ error: "No se pudo cargar la configuración." }, 500);
  }
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return json(UNAUTHORIZED, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }

  const input = parseKeyInput(body);
  if (!input.ok) return json({ error: input.error }, 400);

  const check = await validateProviderKey(input.provider, input.apiKey);
  if (!check.ok) return json({ error: check.error }, 400);

  try {
    const key = await saveKey(userId, input.provider, input.apiKey);
    return json({ key, warning: check.warning });
  } catch {
    return json({ error: "No se pudo guardar la key. Intenta de nuevo." }, 500);
  }
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return json(UNAUTHORIZED, 401);

  const provider = new URL(request.url).searchParams.get("provider");
  if (!isProvider(provider)) return json({ error: "Proveedor no válido." }, 400);

  try {
    await deleteKey(userId, provider);
    return json({ ok: true });
  } catch {
    return json({ error: "No se pudo borrar la key." }, 500);
  }
}
