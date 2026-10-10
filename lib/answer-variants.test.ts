// lib/answer-variants.test.ts
// Casos reportados por un usuario real (10-oct-2026): respuestas correctas marcadas como error.
import { describe, it, expect } from "vitest";
import { gradeExercise, sameAnswer, expandContractions } from "./grade";
import { trimRepeatedTail, validateLesson } from "./lesson-validate";
import type { ClosedExercise } from "./schemas/lesson";

describe("contracciones", () => {
  it("doesn't go = does not go", () => {
    expect(sameAnswer("doesn't go", "does not go")).toBe(true);
    expect(sameAnswer("doesn’t go", "does not go")).toBe(true); // apóstrofo del iPhone
  });
  it("otras formas comunes", () => {
    expect(expandContractions("I'm")).toBe("i am");
    expect(expandContractions("they're")).toBe("they are");
    expect(expandContractions("won't")).toBe("will not");
    expect(expandContractions("can't")).toBe(expandContractions("cannot"));
    expect(expandContractions("she's")).toBe("she is");
  });
  it("no confunde respuestas distintas", () => {
    expect(sameAnswer("does go", "does not go")).toBe(false);
  });
});

describe("respuestas alternativas", () => {
  const ex: ClosedExercise = {
    id: "e1",
    type: "word_order",
    prompt: "Ordena las palabras para formar la frase.",
    words: ["goodbye", "see", "you", "later"],
    answer: "goodbye see you later",
    accepted: ["see you later goodbye"],
    error_type: "word_order",
  };
  it("acepta el otro orden válido", () => {
    expect(gradeExercise(ex, "see you later goodbye").correct).toBe(true);
    expect(gradeExercise(ex, "goodbye see you later").correct).toBe(true);
    expect(gradeExercise(ex, "later see you goodbye").correct).toBe(false);
  });
});

describe("trimRepeatedTail", () => {
  it("no repite palabras que ya están después del espacio", () => {
    expect(trimRepeatedTail("My friend is ___ (from) Spain.", "from Spain")).toBe("from");
    expect(trimRepeatedTail("She ___ (not/go) to the gym.", "does not go")).toBe("does not go");
  });
});

describe("validateLesson con los errores reportados", () => {
  const base = {
    title: "Greetings",
    explanation_es: "x".repeat(300),
    examples: Array.from({ length: 6 }, (_, i) => ({ en: `Example ${i}`, es: `Ejemplo ${i}` })),
    vocabulary: Array.from({ length: 8 }, (_, i) => ({ word: `w${i}`, meaning_es: "m", example: "e" })),
  };
  const open = [
    { id: "e7", type: "writing", prompt: "Escribe", options: null, words: null, answer: null, accepted_answers: null, error_type: null },
    { id: "e8", type: "speaking", prompt: "Habla", options: null, words: null, answer: null, accepted_answers: null, error_type: null },
  ];
  const mc = (n: number) => ({ id: `m${n}`, type: "multiple_choice", prompt: "My ___ is Ana.", options: ["name", "job", "age"], answer: "name", accepted_answers: null, error_type: "vocab" });
  const ctx = { topic_key: "A1_greetings", cefr_level: "A1" as const };

  it("oculta la frase si la instrucción de ordenar la revela", () => {
    const wo = { id: "w", type: "word_order", prompt: "Coloca las palabras en orden: goodbye see you later", options: null, words: ["see", "you", "later", "goodbye"], answer: "goodbye see you later", accepted_answers: ["see you later goodbye"], error_type: "word_order" };
    const r = validateLesson({ ...base, exercises: [wo, mc(1), mc(2), mc(3), mc(4), mc(5), ...open] }, ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ex = r.value.exercises[0] as ClosedExercise;
      expect(ex.prompt).toBe("Ordena las palabras para formar la frase.");
      expect(ex.accepted).toEqual(["see you later goodbye"]);
    }
  });

  it("quita la pista que regala la respuesta y no repite palabras", () => {
    const fb = { id: "f", type: "fill_blank", prompt: "My friend is ___ (from) Spain.", options: null, words: null, answer: "from Spain", accepted_answers: null, error_type: "preposition" };
    const r = validateLesson({ ...base, exercises: [fb, mc(1), mc(2), mc(3), mc(4), mc(5), ...open] }, ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ex = r.value.exercises[0] as ClosedExercise;
      expect(ex.prompt).toBe("My friend is ___ Spain.");
      expect(ex.answer).toBe("from");
    }
  });

  it("mantiene la pista de verbo base aunque coincida: I ___ (go)", () => {
    const fb = { id: "f", type: "fill_blank", prompt: "I ___ (go) to the gym.", options: null, words: null, answer: "go", accepted_answers: null, error_type: "verb_form" };
    const r = validateLesson({ ...base, exercises: [fb, mc(1), mc(2), mc(3), mc(4), mc(5), ...open] }, ctx);
    expect(r.ok && (r.value.exercises[0] as ClosedExercise).prompt).toBe("I ___ (go) to the gym.");
  });
});
