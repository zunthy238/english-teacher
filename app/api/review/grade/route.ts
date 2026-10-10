// app/api/review/grade/route.ts
// POST: califica una tarjeta (Otra vez / Bien / Fácil) y calcula su próxima fecha con FSRS.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResolved, intervalLabel, schedule, type StoredCard } from "@/lib/review";
import { parseGradeInput } from "@/lib/review-input";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return json({ error: "Inicia sesión para continuar." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  const input = parseGradeInput(body);
  if (!input.ok) return json({ error: input.error }, 400);

  // RLS: solo encuentra la tarjeta si es del usuario
  const { data: card, error } = await supabase
    .from("review_cards")
    .select("id, kind, error_type, fsrs")
    .eq("id", input.value.id)
    .maybeSingle();
  if (error || !card) return json({ error: "Tarjeta no encontrada." }, 404);

  const now = new Date();
  const next = schedule(card.fsrs as StoredCard, input.value.rating, now);
  const { error: updateError } = await supabase.from("review_cards").update(next).eq("id", card.id);
  if (updateError) return json({ error: "No se pudo guardar el repaso." }, 500);

  // Un error superado deja de aparecer como frecuente en Progreso
  if (card.kind === "error" && card.error_type && errorResolved(next.reps, input.value.rating)) {
    await supabase.from("errors").update({ resolved: true }).eq("error_type", card.error_type);
  }

  return json({ due_at: next.due_at, label: intervalLabel(now, new Date(next.due_at)) });
}
