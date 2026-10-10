// app/api/roleplay/feedback/route.ts
// POST: retroalimentación al final de la conversación + guarda la sesión de voz y los errores. 1 solicitud de cuota.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeAndGetKey, generateValidated, LessonError } from "@/lib/lessons";
import { feedbackPrompt, feedbackSchema } from "@/lib/prompts/roleplay";
import { parseRoleplayInput, userTurns, validateFeedback } from "@/lib/speak/roleplay";
import { fillJob } from "@/lib/speak/scenarios";
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
  const input = parseRoleplayInput(body, { requireComplete: true });
  if (!input.ok) return json({ error: input.error, code: "input" }, 400);

  try {
    const { data: profile } = await supabase.from("profile").select("cefr_level, job_title").eq("id", userId).maybeSingle();
    const level = (profile?.cefr_level ?? "A1") as CefrLevel;
    const { scenario, messages, minutes } = input.value;
    const turns = userTurns(messages);
    const key = await chargeAndGetKey(userId);
    const feedback = await generateValidated(
      key,
      feedbackPrompt({ level, role: fillJob(scenario.role, profile?.job_title), goal_es: scenario.goal_es, messages }),
      "roleplay_feedback",
      feedbackSchema,
      (raw) => validateFeedback(raw, turns),
    );

    const { error } = await supabase.rpc("record_speaking_result", {
      p_minutes: minutes,
      p_score: Math.round((feedback.understood / Math.max(1, turns)) * 100),
      p_summary: `roleplay:${scenario.id}`,
      p_errors: feedback.corrections.map((c) => ({ error_type: c.error_type, wrong: c.wrong, right: c.right })),
    });
    if (error) console.error("[api/roleplay/feedback] no se guardó el resultado:", error.message);

    return json({ feedback, level });
  } catch (e) {
    if (e instanceof LessonError) return json({ error: e.message, code: e.code }, e.status);
    console.error("[api/roleplay/feedback] error inesperado:", e instanceof Error ? e.message : e);
    return json({ error: "No se pudo preparar tu resultado. Intenta de nuevo.", code: "unknown" }, 500);
  }
}
