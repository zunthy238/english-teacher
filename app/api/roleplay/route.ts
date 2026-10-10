// app/api/roleplay/route.ts
// POST: siguiente respuesta de Professor Mike en el roleplay. 1 solicitud de cuota por turno.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeAndGetKey, generateValidated, LessonError } from "@/lib/lessons";
import { roleplayPrompt, roleplaySchema } from "@/lib/prompts/roleplay";
import { parseRoleplayInput, userTurns, validateReply } from "@/lib/speak/roleplay";
import { fillJob, TURNS } from "@/lib/speak/scenarios";
import type { CefrLevel } from "@/lib/schemas/lesson";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") return json({ error: "Inicia sesión para continuar.", code: "auth" }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  const input = parseRoleplayInput(body);
  if (!input.ok) return json({ error: input.error, code: "input" }, 400);

  try {
    const { data: profile } = await supabase.from("profile").select("cefr_level, job_title").eq("id", userId).maybeSingle();
    const level = (profile?.cefr_level ?? "A1") as CefrLevel;
    const { scenario, messages } = input.value;
    const closing = userTurns(messages) >= TURNS;
    const key = await chargeAndGetKey(userId);
    const reply = await generateValidated(
      key,
      roleplayPrompt({ level, role: fillJob(scenario.role, profile?.job_title), goal_es: scenario.goal_es, messages, closing }),
      "roleplay_turn",
      roleplaySchema,
      (raw) => validateReply(raw, closing),
    );
    return json({ ...reply, done: closing });
  } catch (e) {
    if (e instanceof LessonError) return json({ error: e.message, code: e.code }, e.status);
    console.error("[api/roleplay] error inesperado:", e instanceof Error ? e.message : e);
    return json({ error: "Professor Mike no pudo responder. Intenta de nuevo.", code: "unknown" }, 500);
  }
}
