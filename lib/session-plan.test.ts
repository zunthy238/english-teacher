// lib/session-plan.test.ts
import { describe, it, expect } from "vitest";
import { buildSession, chunkExplanation, correctSentence, blockOf, LIMITS } from "./session-plan";
import { MOCK_LESSONS } from "./mock/lessons";
import { isClosedExercise } from "./schemas/lesson";

describe("chunkExplanation", () => {
  it("separa por párrafos", () => {
    expect(chunkExplanation("Uno.\n\nDos.\n\nTres.")).toEqual(["Uno.", "Dos.", "Tres."]);
  });
  it("un bloque largo se divide por oraciones en máximo 3 tarjetas", () => {
    const text = "A uno. B dos. C tres. D cuatro. E cinco. F seis.";
    const cards = chunkExplanation(text);
    expect(cards.length).toBeLessThanOrEqual(3);
    expect(cards.join(" ")).toBe(text);
  });
  it("no pierde contenido cuando hay más párrafos que tarjetas", () => {
    const cards = chunkExplanation("1\n\n2\n\n3\n\n4\n\n5");
    expect(cards).toHaveLength(3);
    expect(cards[2]).toContain("5");
  });
});

describe("buildSession", () => {
  const lesson = MOCK_LESSONS[1];
  const steps = buildSession(lesson);

  it("empieza en intro y termina en done", () => {
    expect(steps[0].kind).toBe("intro");
    expect(steps.at(-1)?.kind).toBe("done");
  });
  it("sigue el orden pedagógico", () => {
    const order = steps.map(blockOf).filter(Boolean);
    const firstIndex = (b: string) => order.indexOf(b as never);
    expect(firstIndex("learn")).toBeLessThan(firstIndex("listen"));
    expect(firstIndex("listen")).toBeLessThan(firstIndex("vocab"));
    expect(firstIndex("vocab")).toBeLessThan(firstIndex("practice"));
    expect(firstIndex("practice")).toBeLessThan(firstIndex("write"));
  });
  it("respeta los límites para que la sesión sea corta", () => {
    expect(steps.filter((s) => s.kind === "example")).toHaveLength(LIMITS.examples);
    expect(steps.filter((s) => s.kind === "vocab")).toHaveLength(LIMITS.vocab);
    expect(steps.filter((s) => s.kind === "exercise")).toHaveLength(6);
  });
});

describe("correctSentence", () => {
  const closed = MOCK_LESSONS[1].exercises.filter(isClosedExercise);
  it("completa el espacio y quita la pista entre paréntesis", () => {
    const fill = closed.find((e) => e.id === "e3")!; // "My sister ___ (watch) TV at night."
    expect(correctSentence(fill)).toBe("My sister watches TV at night.");
  });
  it("en ordenar palabras devuelve la frase", () => {
    const wo = closed.find((e) => e.type === "word_order")!;
    expect(correctSentence(wo)).toBe(wo.answer);
  });
});

describe("repaso en la sesión", () => {
  const lesson = MOCK_LESSONS[0];
  const card = (id: number) => ({ id, kind: "vocab" as const, front: `w${id}`, back: "m", extra: null, fsrs: {} });
  it("pone el repaso justo después del inicio y lo limita", () => {
    const steps = buildSession(lesson, Array.from({ length: 12 }, (_, i) => card(i + 1)));
    expect(steps[1].kind).toBe("review");
    expect(steps.filter((s) => s.kind === "review")).toHaveLength(LIMITS.review);
  });
  it("sin tarjetas vencidas no hay bloque de repaso", () => {
    expect(buildSession(lesson, []).some((s) => s.kind === "review")).toBe(false);
  });
});
