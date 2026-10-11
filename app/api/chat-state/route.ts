// app/api/chat-state/route.ts
// GET ?topic=&variant= : conversación guardada con Mike · PUT : guardar el avance. Sin IA ni cuota (RLS del usuario).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseChatStatePut } from "@/lib/chat/state";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return { supabase, userId: typeof userId === "string" ? userId : null };
}

export async function GET(request: Request) {
  const { supabase, userId } = await requireUser();
  if (!userId) return json({ error: "Inicia sesión para continuar." }, 401);
  const url = new URL(request.url);
  const topic = url.searchParams.get("topic") ?? "";
  const variant = Number(url.searchParams.get("variant"));
  if (!topic || !Number.isInteger(variant)) return json({ state: null });
  const { data } = await supabase
    .from("chat_state")
    .select("state")
    .eq("topic_key", topic)
    .eq("variant", variant)
    .maybeSingle();
  return json({ state: data?.state ?? null });
}

export async function PUT(request: Request) {
  const { supabase, userId } = await requireUser();
  if (!userId) return json({ error: "Inicia sesión para continuar." }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  const input = parseChatStatePut(body);
  if (!input.ok) return json({ error: input.error }, 400);
  const { error } = await supabase.from("chat_state").upsert(
    { user_id: userId, ...input.value, updated_at: new Date().toISOString() },
    { onConflict: "user_id,topic_key,variant" },
  );
  if (error) return json({ error: "No se pudo guardar la conversación." }, 500);
  return json({ ok: true });
}
