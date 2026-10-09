// lib/progress-input.ts
// Arma y valida el resultado de una lección antes de guardarlo (funciones puras, probadas).
import type { Exercise } from "./schemas/lesson";
import type { GradeResult } from "./grade";

export type ErrorExample = { error_type: string; example_wrong: string; example_right: string };

export type ProgressInput = {
  topic_key: string;
  score: number;
  minutes: number;
  first_attempt: boolean;
  errors: ErrorExample[];
};

// Convierte cada respuesta fallada en un ejemplo "mal → bien" (uno por tipo de error).
export function buildErrorExamples(exercises: Exercise[], results: GradeResult[]): ErrorExample[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const out: ErrorExample[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.correct || seen.has(r.error_type)) continue;
    const ex = byId.get(r.exerciseId);
    if (!ex) continue;
    seen.add(r.error_type);
    const given = r.given.trim() || "(sin respuesta)";
    const fill = (value: string) => (ex.prompt.includes("___") ? ex.prompt.replace("___", value) : value);
    out.push({
      error_type: r.error_type,
      example_wrong: ex.type === "word_order" ? given : fill(given),
      example_right: ex.type === "word_order" ? r.expected : fill(r.expected),
    });
  }
  return out;
}

const SNAKE = /^[a-z][a-z0-9_]{0,59}$/;
const TOPIC = /^(A1|A2|B1|B2|C1)_[a-z0-9_]{1,80}$/;

export function parseProgressInput(body: unknown): { ok: true; value: ProgressInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida." };
  const b = body as Record<string, unknown>;
  if (typeof b.topic_key !== "string" || !TOPIC.test(b.topic_key)) return { ok: false, error: "Tema inválido." };
  if (typeof b.score !== "number" || !Number.isFinite(b.score) || b.score < 0 || b.score > 100)
    return { ok: false, error: "Puntaje inválido." };
  const minutes = typeof b.minutes === "number" && Number.isFinite(b.minutes) ? Math.round(b.minutes) : 0;
  const rawErrors = Array.isArray(b.errors) ? b.errors.slice(0, 10) : [];
  const errors: ErrorExample[] = [];
  for (const e of rawErrors) {
    if (typeof e !== "object" || e === null) continue;
    const { error_type, example_wrong, example_right } = e as Record<string, unknown>;
    if (typeof error_type !== "string" || !SNAKE.test(error_type)) continue;
    if (typeof example_wrong !== "string" || typeof example_right !== "string") continue;
    errors.push({ error_type, example_wrong: example_wrong.slice(0, 300), example_right: example_right.slice(0, 300) });
  }
  return {
    ok: true,
    value: {
      topic_key: b.topic_key,
      score: Math.round(b.score),
      minutes: Math.min(180, Math.max(0, minutes)),
      first_attempt: b.first_attempt === true,
      errors,
    },
  };
}
