// app/api/evaluate/route.ts
// POST: la IA corrige un texto escrito por el estudiante (P4) y se registran sus errores.
// Orden: sesión → validar entrada → cuota + key → IA → validar salida → guardar (RLS del usuario).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeAndGetKey, generateValidated, getProfile, LessonError } from "@/lib/lessons";
import { evaluatePrompt, evaluateSchema } from "@/lib/prompts/evaluate";
import { parseWritingInput, validateEvaluation } from "@/lib/evaluate-validate";

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
  const input = parseWritingInput(body);
  if (!input.ok) return json({ error: input.error, code: "input" }, 400);

  try {
    const { level } = await getProfile(userId);
    const key = await chargeAndGetKey(userId);
    const evaluation = await generateValidated(
      key,
      evaluatePrompt({ level, topic_key: input.value.topic_key, task: input.value.task, text: input.value.text }),
      "evaluation",
      evaluateSchema,
      validateEvaluation,
    );

    const { error } = await supabase.rpc("record_writing_result", {
      p_topic: input.value.topic_key,
      p_score: evaluation.score,
      p_errors: evaluation.corrections,
    });
    if (error) console.error("[api/evaluate] no se guardó el resultado:", error.message);

    return json({ evaluation });
  } catch (e) {
    if (e instanceof LessonError) return json({ error: e.message, code: e.code }, e.status);
    console.error("[api/evaluate] error inesperado:", e instanceof Error ? e.message : e);
    return json({ error: "No se pudo corregir tu texto. Intenta de nuevo.", code: "unknown" }, 500);
  }
}
