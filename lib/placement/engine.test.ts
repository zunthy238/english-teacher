import { describe, expect, it } from "vitest";
import { PLACEMENT_BANK, correctOption, shuffledOptions } from "./bank";
import {
  LEVELS, TEST_LENGTH, allowedStartLevels, levelFor, nextItem, parsePlacementInput, scorePlacement,
  type Answer, type Response,
} from "./engine";
import type { CefrLevel } from "../schemas/lesson";

// Simula a una persona que domina hasta cierto nivel (sin adivinar)
function simulate(mastery: number): Answer[] {
  const responses: Response[] = [];
  const answers: Answer[] = [];
  for (let item = nextItem(responses); item; item = nextItem(responses)) {
    const correct = LEVELS.indexOf(item.level) <= mastery;
    responses.push({ item, correct });
    answers.push({ id: item.id, choice: correct ? correctOption(item) : null });
  }
  return answers;
}

describe("banco de la prueba de nivel", () => {
  it("tiene ids únicos y opciones sin repetir", () => {
    expect(new Set(PLACEMENT_BANK.map((i) => i.id)).size).toBe(PLACEMENT_BANK.length);
    for (const i of PLACEMENT_BANK) expect(new Set(i.options).size).toBe(4);
  });
  it("cubre cada nivel y habilidad con al menos 2 preguntas", () => {
    for (const level of LEVELS)
      for (const skill of ["grammar", "vocab", "reading", "listening"])
        expect(PLACEMENT_BANK.filter((i) => i.level === level && i.skill === skill).length).toBeGreaterThanOrEqual(2);
  });
  it("lectura trae texto y escucha trae audio", () => {
    for (const i of PLACEMENT_BANK) {
      if (i.skill === "reading") expect(i.passage).toBeTruthy();
      if (i.skill === "listening") expect(i.audio).toBeTruthy();
    }
  });
  it("mezcla las opciones de forma estable y no deja la correcta siempre primero", () => {
    const first = PLACEMENT_BANK.filter((i) => shuffledOptions(i)[0] === correctOption(i)).length;
    expect(first).toBeLessThan(PLACEMENT_BANK.length / 2);
    expect(shuffledOptions(PLACEMENT_BANK[0])).toEqual(shuffledOptions(PLACEMENT_BANK[0]));
  });
});

describe("motor adaptativo", () => {
  it("hace 15 preguntas sin repetir y rota las 4 habilidades", () => {
    const answers = simulate(2);
    expect(answers).toHaveLength(TEST_LENGTH);
    expect(new Set(answers.map((a) => a.id)).size).toBe(TEST_LENGTH);
    const r = scorePlacement(answers);
    for (const s of ["grammar", "vocab", "reading", "listening"] as const) expect(r.skills[s].answered).toBeGreaterThanOrEqual(3);
  });
  it.each([
    [0, "A1"], [1, "A2"], [2, "B1"], [3, "B2"], [4, "C1"],
  ] as [number, CefrLevel][])("quien domina hasta el nivel %i queda en %s", (mastery, level) => {
    expect(scorePlacement(simulate(mastery)).level).toBe(level);
  });
  it("quien no sabe nada queda en A1", () => {
    expect(scorePlacement(simulate(-1)).level).toBe("A1");
  });
  it("la 1ª pregunta es suave (A2)", () => {
    expect(nextItem([])?.level).toBe("A2");
  });
  it("detecta la habilidad más débil", () => {
    const responses: Response[] = [];
    const answers: Answer[] = [];
    for (let item = nextItem(responses); item; item = nextItem(responses)) {
      const correct = item.skill === "listening" ? LEVELS.indexOf(item.level) <= 0 : LEVELS.indexOf(item.level) <= 2;
      responses.push({ item, correct });
      answers.push({ id: item.id, choice: correct ? correctOption(item) : "x" });
    }
    const fixed = answers.map((a) => (a.choice === "x" ? { ...a, choice: null } : a));
    expect(scorePlacement(fixed).focus).toBe("listening");
  });
  it("niveles: cortes y opciones de inicio", () => {
    expect(levelFor(0.5)).toBe("B1");
    expect(levelFor(-1.5)).toBe("A1");
    expect(allowedStartLevels("B1")).toEqual(["B1", "A2"]);
    expect(allowedStartLevels("A1")).toEqual(["A1"]);
  });
});

describe("validación de la entrada", () => {
  const answers = simulate(2);
  it("acepta una prueba completa", () => {
    expect(parsePlacementInput({ answers, start_level: "B1" }).ok).toBe(true);
  });
  it("rechaza preguntas repetidas, opciones inventadas y niveles raros", () => {
    expect(parsePlacementInput({ answers: [...answers.slice(0, 5), answers[0]], start_level: "B1" }).ok).toBe(false);
    expect(parsePlacementInput({ answers: [{ id: answers[0].id, choice: "hack" }, ...answers.slice(1)], start_level: "B1" }).ok).toBe(false);
    expect(parsePlacementInput({ answers, start_level: "Z9" }).ok).toBe(false);
    expect(parsePlacementInput({ answers: answers.slice(0, 2), start_level: "B1" }).ok).toBe(false);
  });
});
