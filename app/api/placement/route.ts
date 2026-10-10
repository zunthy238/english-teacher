// app/api/placement/route.ts
// POST: guarda la prueba de nivel y fija el nivel de inicio. Sin IA ni cuota.
// El servidor RECALCULA el resultado con el mismo motor: no confía en el nivel que mande el navegador.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { allowedStartLevels, parsePlacementInput, scorePlacement } from "@/lib/placement/engine";

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
  const input = parsePlacementInput(body);
  if (!input.ok) return json({ error: input.error }, 400);

  const result = scorePlacement(input.value.answers);
  if (!allowedStartLevels(result.level).includes(input.value.start_level)) {
    return json({ error: "Ese nivel de inicio no corresponde a tu resultado." }, 400);
  }

  const { error: insertError } = await supabase.from("placement_tests").insert({
    user_id: userId,
    level: result.level,
    start_level: input.value.start_level,
    theta: result.theta,
    skills: result.skills,
    answers: input.value.answers,
  });
  if (insertError) {
    console.error("[api/placement]", insertError.message);
    return json({ error: "No se pudo guardar tu prueba." }, 500);
  }

  const { error: profileError } = await supabase
    .from("profile")
    .update({ cefr_level: input.value.start_level, placement_at: new Date().toISOString() })
    .eq("id", userId);
  if (profileError) {
    console.error("[api/placement] profile", profileError.message);
    return json({ error: "No se pudo actualizar tu nivel." }, 500);
  }

  return json({ level: result.level, start_level: input.value.start_level });
}
