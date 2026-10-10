// lib/grade.ts
// Calificación local de ejercicios cerrados. Función pura: sin red, sin API, sin base de datos.
// CP-4: los failedErrorTypes se registrarán en la tabla errors (count+1, last_seen).
import type { ClosedExercise, Exercise } from "./schemas/lesson";
import { isClosedExercise } from "./schemas/lesson";

export function normalize(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’‘`]/g, "'") // apóstrofos del celular
    .replace(/[.,!?¿¡;:"]/g, "") // puntuación
    .replace(/\s+/g, " ") // espacios repetidos
    .trim();
}

// Contracciones: "doesn't go" y "does not go" son la misma respuesta.
const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon't\b/g, "will not"],
  [/\bcan't\b/g, "can not"],
  [/\bcannot\b/g, "can not"],
  [/\bshan't\b/g, "shall not"],
  [/\bain't\b/g, "am not"],
  [/n't\b/g, " not"],
  [/'m\b/g, " am"],
  [/'re\b/g, " are"],
  [/'ve\b/g, " have"],
  [/'ll\b/g, " will"],
  [/'d\b/g, " would"],
  [/\b(he|she|it|that|what|who|where|there|here|how)'s\b/g, "$1 is"],
];

export function expandContractions(text: string): string {
  let out = normalize(text);
  for (const [re, rep] of CONTRACTIONS) out = out.replace(re, rep);
  return out.replace(/\s+/g, " ").trim();
}

export function sameAnswer(a: string, b: string): boolean {
  return expandContractions(a) === expandContractions(b);
}

export type GradeResult = {
  exerciseId: string;
  correct: boolean;
  expected: string;
  given: string;
  error_type: string;
};

export function gradeExercise(ex: ClosedExercise, given: string): GradeResult {
  return {
    exerciseId: ex.id,
    correct: [ex.answer, ...(ex.accepted ?? [])].some((ans) => sameAnswer(given, ans)),
    expected: ex.answer,
    given,
    error_type: ex.error_type,
  };
}

export type LessonGrade = {
  results: GradeResult[];
  correct: number;
  total: number;
  score: number; // 0-100
  failedErrorTypes: string[]; // sin repetidos
};

export function gradeLesson(
  exercises: Exercise[],
  answers: Record<string, string>,
): LessonGrade {
  const closed = exercises.filter(isClosedExercise);
  const results = closed.map((ex) => gradeExercise(ex, answers[ex.id] ?? ""));
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  const failedErrorTypes = [
    ...new Set(results.filter((r) => !r.correct).map((r) => r.error_type)),
  ];
  return { results, correct, total, score, failedErrorTypes };
}