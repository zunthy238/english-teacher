// lib/progress-input.test.ts
import { describe, it, expect } from "vitest";
import { buildErrorExamples, parseProgressInput } from "./progress-input";
import { gradeLesson } from "./grade";
import { MOCK_LESSONS } from "./mock/lessons";

const lesson = MOCK_LESSONS[1]; // present simple

describe("buildErrorExamples", () => {
  it("arma ejemplos mal → bien, uno por tipo de error", () => {
    const g = gradeLesson(lesson.exercises, {
      e1: "drink", // third_person_s
      e2: "Does",
      e3: "watchs", // third_person_s (repetido: se ignora)
      e4: "go",
      e5: "I wake up usually at seven", // adverb_position
      e6: "Does he work from home",
    });
    const ex = buildErrorExamples(lesson.exercises, g.results);
    expect(ex.map((e) => e.error_type)).toEqual(["third_person_s", "adverb_position"]);
    expect(ex[0]).toEqual({
      error_type: "third_person_s",
      example_wrong: "He drink coffee every morning.",
      example_right: "He drinks coffee every morning.",
    });
    expect(ex[1].example_right).toBe("I usually wake up at seven");
  });

  it("marca las respuestas vacías", () => {
    const g = gradeLesson(lesson.exercises, {});
    expect(buildErrorExamples(lesson.exercises, g.results)[0].example_wrong).toContain("(sin respuesta)");
  });
});

describe("parseProgressInput", () => {
  const ok = { topic_key: "A1_present_simple", score: 83.3, minutes: 12.4, first_attempt: true, errors: [] };

  it("acepta y redondea un resultado válido", () => {
    const r = parseProgressInput(ok);
    expect(r.ok && r.value).toEqual({ ...ok, score: 83, minutes: 12 });
  });
  it("rechaza puntajes fuera de 0-100 y temas inválidos", () => {
    expect(parseProgressInput({ ...ok, score: 101 }).ok).toBe(false);
    expect(parseProgressInput({ ...ok, topic_key: "drop table" }).ok).toBe(false);
  });
  it("limita minutos y descarta errores mal formados", () => {
    const r = parseProgressInput({
      ...ok,
      minutes: 999,
      errors: [{ error_type: "Bad Type", example_wrong: "x", example_right: "y" }, { error_type: "ok_type", example_wrong: "a", example_right: "b" }],
    });
    expect(r.ok && r.value.minutes).toBe(180);
    expect(r.ok && r.value.errors.map((e) => e.error_type)).toEqual(["ok_type"]);
  });
});
