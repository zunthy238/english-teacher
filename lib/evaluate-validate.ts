// lib/evaluate-validate.ts
// Revisa la corrección que devuelve la IA y el texto que envía el estudiante (funciones puras, probadas).
import { toSnakeCase } from "./lesson-validate";

export type Correction = { wrong: string; right: string; explanation: string; error_type: string };
export type Evaluation = {
  corrections: Correction[];
  improved_version: string;
  score: number;
  strengths: string[];
  next_focus: string;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function validateEvaluation(raw: unknown): { ok: true; value: Evaluation } | { ok: false; errors: string[] } {
  if (typeof raw !== "object" || raw === null) return { ok: false, errors: ["La respuesta no es un objeto"] };
  const r = raw as Record<string, unknown>;
  const improved_version = str(r.improved_version);
  const next_focus = str(r.next_focus);
  const score = typeof r.score === "number" && Number.isFinite(r.score) ? Math.round(r.score) : NaN;
  const errors: string[] = [];
  if (!improved_version) errors.push("Falta improved_version");
  if (!next_focus) errors.push("Falta next_focus");
  if (Number.isNaN(score)) errors.push("Falta score");
  if (errors.length) return { ok: false, errors };

  const corrections = (Array.isArray(r.corrections) ? r.corrections : [])
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      wrong: str(c.wrong),
      right: str(c.right),
      explanation: str(c.explanation),
      error_type: toSnakeCase(str(c.error_type)) || "general",
    }))
    .filter((c) => c.wrong && c.right && c.wrong !== c.right) // sin "correcciones" que no cambian nada
    .slice(0, 10);

  const strengths = (Array.isArray(r.strengths) ? r.strengths : []).map(str).filter(Boolean).slice(0, 2);

  return {
    ok: true,
    value: { corrections, improved_version, score: Math.min(100, Math.max(0, score)), strengths, next_focus },
  };
}

const TOPIC = /^(A1|A2|B1|B2|C1)_[a-z0-9_]{1,80}$/;

export function parseWritingInput(
  body: unknown,
): { ok: true; value: { topic_key: string; task: string; text: string } } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida." };
  const b = body as Record<string, unknown>;
  const topic_key = str(b.topic_key);
  const task = str(b.task).slice(0, 500);
  const text = str(b.text);
  if (!TOPIC.test(topic_key)) return { ok: false, error: "Tema inválido." };
  if (!task) return { ok: false, error: "Falta la consigna." };
  if (text.split(/\s+/).filter(Boolean).length < 3) return { ok: false, error: "Escribe al menos una frase completa." };
  if (text.length > 2000) return { ok: false, error: "El texto es muy largo (máximo 2000 caracteres)." };
  return { ok: true, value: { topic_key, task, text } };
}
