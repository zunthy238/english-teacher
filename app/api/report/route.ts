// app/api/report/route.ts
// POST: guarda un reporte de ejercicio. Escribe con la sesión del usuario (RLS). No usa IA ni cuota.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseReportInput } from "@/lib/report-input";
import { PROMPT_VERSION } from "@/lib/prompts/version";

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
  const input = parseReportInput(body);
  if (!input.ok) return json({ error: input.error }, 400);

  const { error } = await supabase.from("exercise_reports").insert({
    user_id: userId,
    prompt_version: PROMPT_VERSION,
    ...input.value,
  });
  if (error) {
    console.error("[api/report]", error.message);
    return json({ error: "No se pudo enviar el reporte." }, 500);
  }
  return json({ ok: true });
}
