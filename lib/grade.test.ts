// lib/grade.test.ts
import { describe, it, expect } from "vitest";
import { normalize, gradeExercise, gradeLesson } from "./grade";
import { MOCK_LESSONS } from "./mock/lessons";
import { isClosedExercise } from "./schemas/lesson";

const lesson = MOCK_LESSONS[1]; // A1_present_simple
const closed = lesson.exercises.filter(isClosedExercise);
const byId = (id: string) => {
  const ex = closed.find((e) => e.id === id);
  if (!ex) throw new Error(`No existe ${id}`);
  return ex;
};

describe("normalize", () => {
  it("ignora mayúsculas, espacios y puntuación", () => {
    expect(normalize("  Does HE work   from home? ")).toBe("does he work from home");
  });
  it("unifica apóstrofos del celular", () => {
    expect(normalize("I’m")).toBe("i'm");
  });
});

describe("gradeExercise", () => {
  it("acepta la respuesta correcta sin importar mayúsculas", () => {
    expect(gradeExercise(byId("e1"), "DRINKS").correct).toBe(true);
  });
  it("marca el error y devuelve su error_type", () => {
    const r = gradeExercise(byId("e1"), "drink");
    expect(r.correct).toBe(false);
    expect(r.error_type).toBe("third_person_s");
  });
  it("una respuesta vacía es incorrecta", () => {
    expect(gradeExercise(byId("e3"), "").correct).toBe(false);
  });
  it("word_order acepta puntuación final", () => {
    expect(gradeExercise(byId("e6"), "Does he work from home?").correct).toBe(true);
  });
});

describe("gradeLesson", () => {
  it("califica solo los cerrados y calcula el puntaje", () => {
    const g = gradeLesson(lesson.exercises, {
      e1: "drinks",
      e2: "Does",
      e3: "watchs", // error
      e4: "go",
      e5: "I wake up usually at seven", // error
      e6: "Does he work from home",
    });
    expect(g.total).toBe(6);
    expect(g.correct).toBe(4);
    expect(g.score).toBe(67);
    expect(g.failedErrorTypes).toEqual(["third_person_s", "adverb_position"]);
  });

  it("las lecciones de prueba son consistentes", () => {
    for (const l of MOCK_LESSONS) {
      const c = l.exercises.filter(isClosedExercise);
      expect(c).toHaveLength(6);
      for (const ex of c) {
        if (ex.type === "multiple_choice") expect(ex.options).toContain(ex.answer);
        if (ex.type === "word_order") {
          const fromAnswer = normalize(ex.answer).split(" ").sort();
          const fromWords = ex.words.map(normalize).sort();
          expect(fromWords).toEqual(fromAnswer);
        }
      }
    }
  });
});