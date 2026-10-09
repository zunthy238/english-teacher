// lib/lesson-validate.test.ts
import { describe, it, expect } from "vitest";
import { validateLesson, validateCurriculum, toSnakeCase } from "./lesson-validate";
import { MOCK_LESSONS } from "./mock/lessons";
import { isClosedExercise } from "./schemas/lesson";

// Convierte una lección de prueba al formato "plano" que devuelve la IA.
function asRaw(lessonIndex = 0) {
  const l = MOCK_LESSONS[lessonIndex];
  return {
    title: l.title,
    explanation_es: l.explanation_es,
    examples: l.examples,
    vocabulary: l.vocabulary,
    exercises: l.exercises.map((e) => ({
      id: e.id,
      type: e.type,
      prompt: e.prompt,
      options: e.type === "multiple_choice" ? e.options : null,
      words: e.type === "word_order" ? e.words : null,
      answer: isClosedExercise(e) ? e.answer : null,
      error_type: isClosedExercise(e) ? e.error_type : null,
    })),
  };
}
const ctx = { topic_key: "A1_verb_to_be", cefr_level: "A1" as const };

describe("validateLesson", () => {
  it("acepta lecciones bien formadas", () => {
    for (const i of [0, 1]) {
      const r = validateLesson(asRaw(i), ctx);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.exercises).toHaveLength(8);
    }
  });

  it("rechaza opción múltiple sin la respuesta entre las opciones", () => {
    const raw = asRaw();
    raw.exercises[0] = { ...raw.exercises[0], answer: "were" };
    const r = validateLesson(raw, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("no está entre las opciones");
  });

  it("rechaza word_order cuyas palabras no coinciden", () => {
    const raw = asRaw();
    raw.exercises[4] = { ...raw.exercises[4], words: ["she", "is", "from"] };
    expect(validateLesson(raw, ctx).ok).toBe(false);
  });

  it("rechaza si falta writing o speaking", () => {
    const raw = asRaw();
    raw.exercises = raw.exercises.filter((e) => e.type !== "speaking");
    expect(validateLesson(raw, ctx).ok).toBe(false);
  });

  it("quita traducciones desde B2", () => {
    const r = validateLesson(asRaw(), { topic_key: "B2_x", cefr_level: "B2" });
    expect(r.ok && r.value.examples.every((e) => e.es === null)).toBe(true);
  });

  it("asigna ids únicos e1…e8 aunque la IA los repita", () => {
    const raw = asRaw();
    raw.exercises = raw.exercises.map((e) => ({ ...e, id: "x" }));
    const r = validateLesson(raw, ctx);
    expect(r.ok && r.value.exercises.map((e) => e.id)).toEqual(["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"]);
  });

  it("normaliza error_type a snake_case", () => {
    expect(toSnakeCase("Third Person S")).toBe("third_person_s");
  });
});

describe("validateCurriculum", () => {
  const topic = (k: string) => ({ topic_key: k, title: k, objectives: ["El estudiante puede…"], skills: ["speaking"] });

  it("acepta 20 temas y normaliza el prefijo del nivel", () => {
    const raw = { topics: Array.from({ length: 20 }, (_, i) => topic(`a1_topic_${i}`)) };
    const r = validateCurriculum(raw, "A1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value[0].topic_key).toBe("A1_topic_0");
  });

  it("descarta duplicados y rechaza listas muy cortas", () => {
    const raw = { topics: Array.from({ length: 20 }, () => topic("A1_same")) };
    expect(validateCurriculum(raw, "A1").ok).toBe(false);
  });
});
