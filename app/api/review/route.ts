// app/api/review/route.ts
// GET: tarjetas para repasar hoy (vencidas) · POST: agregar tarjetas al terminar una sesión.
// Usa la sesión del usuario (RLS). No usa IA ni cuota: el repaso es gratis.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { newCard } from "@/lib/review";
import { parseSeedInput } from "@/lib/review-input";

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

  const limitParam = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(limitParam) ? Math.min(50, Math.max(1, Math.floor(limitParam))) : 20;
  const now = new Date().toISOString();

  const [cards, count] = await Promise.all([
    supabase
      .from("review_cards")
      .select("id, kind, front, back, extra, fsrs")
      .lte("due_at", now)
      .order("due_at")
      .limit(limit),
    supabase.from("review_cards").select("*", { count: "exact", head: true }).lte("due_at", now),
  ]);
  if (cards.error) return json({ error: "No se pudo cargar el repaso." }, 500);
  return json({ cards: cards.data ?? [], due_count: count.count ?? 0 });
}

export async function POST(request: Request) {
  const { supabase, userId } = await requireUser();
  if (!userId) return json({ error: "Inicia sesión para continuar." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  const input = parseSeedInput(body);
  if (!input.ok) return json({ error: input.error }, 400);

  const now = new Date();
  const rows = input.value.cards.map((c) => ({
    ...c,
    user_id: userId,
    topic_key: input.value.topic_key,
    ...newCard(now),
    reps: 0,
    lapses: 0,
    last_review: null,
  }));
  const learn = rows.filter((r) => r.kind !== "error");
  const errors = rows.filter((r) => r.kind === "error");

  // Vocabulario y frases: si ya existe la tarjeta, se respeta su calendario
  if (learn.length) {
    const { error } = await supabase
      .from("review_cards")
      .upsert(learn, { onConflict: "user_id,kind,front", ignoreDuplicates: true });
    if (error) {
      console.error("[api/review] seed", error.message);
      return json({ error: "No se pudieron guardar las tarjetas." }, 500);
    }
  }
  // Errores: si vuelve a cometerlo, la tarjeta se reinicia para repasarla pronto
  if (errors.length) {
    const { error } = await supabase.from("review_cards").upsert(errors, { onConflict: "user_id,kind,front" });
    if (error) {
      console.error("[api/review] seed errors", error.message);
      return json({ error: "No se pudieron guardar las tarjetas." }, 500);
    }
  }
  return json({ added: rows.length });
}
