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
    correct: normalize(given) === normalize(ex.answer),
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