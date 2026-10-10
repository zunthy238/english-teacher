// lib/review-input.ts
// Arma las tarjetas a partir de una lección y valida lo que llega a /api/review (funciones puras, probadas).
import type { Lesson } from "./schemas/lesson";
import type { ErrorExample } from "./progress-input";
import type { ReviewRating } from "./review";

export type SeedCard = {
  kind: "vocab" | "phrase" | "error";
  front: string;
  back: string;
  extra: string | null;
  error_type: string | null;
};

const MAX_TEXT = 300;
const cut = (s: string) => s.trim().slice(0, MAX_TEXT);

// Vocabulario + frases vistas en la sesión + errores (forma correcta al frente)
export function buildSeedCards(lesson: Lesson, errors: ErrorExample[], limits = { vocab: 6, phrases: 4 }): SeedCard[] {
  const cards: SeedCard[] = [];
  for (const v of lesson.vocabulary.slice(0, limits.vocab)) {
    cards.push({ kind: "vocab", front: cut(v.word), back: cut(v.meaning_es), extra: cut(v.example), error_type: null });
  }
  for (const e of lesson.examples.slice(0, limits.phrases)) {
    if (!e.es) continue;
    cards.push({ kind: "phrase", front: cut(e.en), back: cut(e.es), extra: null, error_type: null });
  }
  for (const err of errors) {
    cards.push({
      kind: "error",
      front: cut(err.example_right),
      back: "Forma correcta",
      extra: cut(`No digas: ${err.example_wrong}`),
      error_type: err.error_type,
    });
  }
  return cards;
}

const KINDS = ["vocab", "phrase", "error"] as const;
const TOPIC = /^(A1|A2|B1|B2|C1)_[a-z0-9_]{1,80}$/;
const SNAKE = /^[a-z][a-z0-9_]{0,59}$/;

export function parseSeedInput(
  body: unknown,
): { ok: true; value: { topic_key: string; cards: SeedCard[] } } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida." };
  const b = body as Record<string, unknown>;
  if (typeof b.topic_key !== "string" || !TOPIC.test(b.topic_key)) return { ok: false, error: "Tema inválido." };
  if (!Array.isArray(b.cards)) return { ok: false, error: "Faltan tarjetas." };
  const cards: SeedCard[] = [];
  for (const raw of b.cards.slice(0, 30)) {
    if (typeof raw !== "object" || raw === null) continue;
    const c = raw as Record<string, unknown>;
    if (!(KINDS as readonly string[]).includes(String(c.kind))) continue;
    if (typeof c.front !== "string" || typeof c.back !== "string" || !c.front.trim() || !c.back.trim()) continue;
    const error_type = typeof c.error_type === "string" && SNAKE.test(c.error_type) ? c.error_type : null;
    if (c.kind === "error" && !error_type) continue;
    cards.push({
      kind: c.kind as SeedCard["kind"],
      front: cut(c.front),
      back: cut(c.back),
      extra: typeof c.extra === "string" && c.extra.trim() ? cut(c.extra) : null,
      error_type: c.kind === "error" ? error_type : null,
    });
  }
  return { ok: true, value: { topic_key: b.topic_key, cards } };
}

export function parseGradeInput(
  body: unknown,
): { ok: true; value: { id: number; rating: ReviewRating } } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida." };
  const b = body as Record<string, unknown>;
  if (typeof b.id !== "number" || !Number.isInteger(b.id) || b.id <= 0) return { ok: false, error: "Tarjeta inválida." };
  if (b.rating !== "again" && b.rating !== "good" && b.rating !== "easy") return { ok: false, error: "Calificación inválida." };
  return { ok: true, value: { id: b.id, rating: b.rating } };
}

// Tarjeta tal como la usa la pantalla de repaso
export type ReviewItem = {
  id: number;
  kind: "vocab" | "phrase" | "error";
  front: string;
  back: string;
  extra: string | null;
  fsrs: Record<string, unknown>;
};
