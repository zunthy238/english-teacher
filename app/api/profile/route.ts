// app/api/profile/route.ts
// GET: meta diaria actual · PATCH: cambiar la meta diaria. Con la sesión del usuario (RLS).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseGoalInput } from "@/lib/goal";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return { supabase, userId: typeof userId === "string" ? userId : null };
}

export async function GET() {
  const { supabase, userId } = await requireUser();
  if (!userId) return json({ error: "Inicia sesión para continuar." }, 401);
  const { data } = await supabase.from("profile").select("daily_minutes, cefr_level").eq("id", userId).maybeSingle();
  return json({ daily_minutes: data?.daily_minutes ?? 30, cefr_level: data?.cefr_level ?? "A1" });
}

export async function PATCH(request: Request) {
  const { supabase, userId } = await requireUser();
  if (!userId) return json({ error: "Inicia sesión para continuar." }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  const input = parseGoalInput(body);
  if (!input.ok) return json({ error: input.error }, 400);
  const { error } = await supabase.from("profile").update({ daily_minutes: input.value }).eq("id", userId);
  if (error) return json({ error: "No se pudo guardar la meta." }, 500);
  return json({ daily_minutes: input.value });
}
