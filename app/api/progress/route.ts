// app/api/progress/route.ts
// POST: guarda el resultado de una lección (sesión, errores y tema completado) y responde si se cumplió la meta del día.
// Escribe con el cliente del usuario: RLS garantiza que solo toca sus propios datos. No usa IA ni cuota.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseProgressInput } from "@/lib/progress-input";
import { goalStatus } from "@/lib/goal";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") return json({ error: "Inicia sesión para continuar." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  const input = parseProgressInput(body);
  if (!input.ok) return json({ error: input.error }, 400);

  const { data: completed, error } = await supabase.rpc("record_lesson_result", {
    p_topic: input.value.topic_key,
    p_score: input.value.score,
    p_minutes: input.value.minutes,
    p_errors: input.value.errors,
    p_first_attempt: input.value.first_attempt,
  });
  if (error) {
    console.error("[api/progress]", error.message);
    return json({ error: "No se pudo guardar tu progreso." }, 500);
  }

  // Meta del día (si falla, no afecta el guardado)
  const since = new Date(Date.now() - 36 * 3600_000).toISOString();
  const [profile, sessions] = await Promise.all([
    supabase.from("profile").select("daily_minutes").eq("id", userId).maybeSingle(),
    supabase.from("sessions").select("created_at, minutes").gte("created_at", since),
  ]);
  const goal = goalStatus({
    now: new Date(),
    goal: profile.data?.daily_minutes ?? 30,
    sessionMinutes: input.value.minutes,
    sessions: sessions.data ?? [],
  });

  return json({ completed: completed === true, goal });
}
