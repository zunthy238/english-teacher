// lib/session-plan.ts
// Convierte una lección en una SESIÓN GUIADA: una tarjeta a la vez (funciones puras, probadas).
// Orden pedagógico: aprende (poco texto) → escucha ejemplos → vocabulario → practica → escribe → cierre.
import type { ClosedExercise, Example, Lesson, VocabularyItem } from "./schemas/lesson";
import { isClosedExercise } from "./schemas/lesson";
import type { ReviewItem } from "./review-input";

export type Block = "review" | "learn" | "listen" | "vocab" | "practice" | "write";

export type SessionStep =
  | { kind: "intro" }
  | { kind: "review"; card: ReviewItem; index: number; total: number }
  | { kind: "learn"; text: string; index: number; total: number }
  | { kind: "example"; example: Example; index: number; total: number }
  | { kind: "vocab"; item: VocabularyItem; index: number; total: number }
  | { kind: "exercise"; exercise: ClosedExercise; index: number; total: number }
  | { kind: "write"; task: string }
  | { kind: "done" };

export const LIMITS = { learnCards: 3, examples: 4, vocab: 6, review: 8 } as const;

// Parte la explicación en tarjetas cortas: por párrafos; si es un solo bloque, por oraciones.
export function chunkExplanation(text: string, maxCards: number = LIMITS.learnCards): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];
  let parts = clean
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 1) {
    const sentences = clean.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
    const per = Math.max(1, Math.ceil(sentences.length / maxCards));
    parts = [];
    for (let i = 0; i < sentences.length; i += per) parts.push(sentences.slice(i, i + per).join(" "));
  }
  if (parts.length > maxCards) {
    // Junta lo que sobra en la última tarjeta para no perder contenido
    parts = [...parts.slice(0, maxCards - 1), parts.slice(maxCards - 1).join("\n\n")];
  }
  return parts;
}

export function blockOf(step: SessionStep): Block | null {
  switch (step.kind) {
    case "review":
      return "review";
    case "learn":
      return "learn";
    case "example":
      return "listen";
    case "vocab":
      return "vocab";
    case "exercise":
      return "practice";
    case "write":
      return "write";
    default:
      return null;
  }
}

// El repaso va primero: calienta la memoria con lo que estás por olvidar
export function buildSession(lesson: Lesson, reviews: ReviewItem[] = []): SessionStep[] {
  const learn = chunkExplanation(lesson.explanation_es);
  const examples = lesson.examples.slice(0, LIMITS.examples);
  const vocab = lesson.vocabulary.slice(0, LIMITS.vocab);
  const closed = lesson.exercises.filter(isClosedExercise);
  const writing = lesson.exercises.find((e) => e.type === "writing");

  const due = reviews.slice(0, LIMITS.review);

  const steps: SessionStep[] = [{ kind: "intro" }];
  due.forEach((card, i) => steps.push({ kind: "review", card, index: i + 1, total: due.length }));
  learn.forEach((text, i) => steps.push({ kind: "learn", text, index: i + 1, total: learn.length }));
  examples.forEach((example, i) => steps.push({ kind: "example", example, index: i + 1, total: examples.length }));
  vocab.forEach((item, i) => steps.push({ kind: "vocab", item, index: i + 1, total: vocab.length }));
  closed.forEach((exercise, i) => steps.push({ kind: "exercise", exercise, index: i + 1, total: closed.length }));
  if (writing) steps.push({ kind: "write", task: writing.prompt });
  steps.push({ kind: "done" });
  return steps;
}

// Frase completa y correcta (para escucharla tras responder)
export function correctSentence(ex: ClosedExercise): string {
  if (ex.type === "word_order") return ex.answer;
  return ex.prompt.includes("___")
    ? ex.prompt.replace("___", ex.answer).replace(/\s*\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim()
    : ex.answer;
}
