// app/api/transcribe/route.ts
// PLAN B del micrófono: si el reconocimiento de voz del navegador falla, se transcribe el audio con OpenAI
// (gpt-4o-mini-transcribe, ≈ $0.003/min, con la key del usuario). 1 solicitud de cuota. El audio no se guarda.
import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { resolveKey } from "@/lib/keys";
import { consumeRequest } from "@/lib/quota";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const MAX_BYTES = 3 * 1024 * 1024; // ~1 minuto de voz
const MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return json({ error: "Inicia sesión para continuar.", code: "auth" }, 401);

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("audio");
    audio = f instanceof File ? f : null;
  } catch {
    return json({ error: "Audio inválido." }, 400);
  }
  if (!audio || audio.size === 0) return json({ error: "No llegó audio." }, 400);
  if (audio.size > MAX_BYTES) return json({ error: "El audio es muy largo (máximo ~1 minuto)." }, 413);

  try {
    // Primero se revisa la key (sin gastar cuota); solo OpenAI ofrece esta transcripción
    const key = await resolveKey(userId);
    if (!key) return json({ error: "Registra tu API key en Ajustes.", code: "no_key" }, 409);
    if (key.provider !== "openai") {
      return json({ error: "El plan B del micrófono necesita una key de OpenAI. Puedes escribir tu respuesta.", code: "needs_openai" }, 409);
    }
    const quota = await consumeRequest(userId);
    if (!quota.allowed) return json({ error: `Llegaste al límite de ${quota.limit} solicitudes de hoy.`, code: "quota" }, 429);
    const form = new FormData();
    form.append("file", audio, audio.name || "audio.m4a");
    form.append("model", MODEL);
    form.append("language", "en");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[api/transcribe] proveedor respondió", res.status);
      return json({ error: "No se pudo transcribir el audio. Intenta de nuevo.", code: "provider_error" }, 502);
    }
    const data = await res.json();
    const text = typeof data?.text === "string" ? data.text.trim().slice(0, 400) : "";
    return json({ text });
  } catch (e) {
    console.error("[api/transcribe] error inesperado:", e instanceof Error ? e.message : e);
    return json({ error: "No se pudo transcribir el audio.", code: "unknown" }, 500);
  }
}
