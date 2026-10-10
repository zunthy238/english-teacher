// lib/review-input.test.ts
import { describe, it, expect } from "vitest";
import { buildSeedCards, parseSeedInput, parseGradeInput } from "./review-input";
import { MOCK_LESSONS } from "./mock/lessons";

describe("buildSeedCards", () => {
  it("crea tarjetas de vocabulario, frases y errores", () => {
    const cards = buildSeedCards(MOCK_LESSONS[1], [
      { error_type: "third_person_s", example_wrong: "He drink coffee.", example_right: "He drinks coffee." },
    ]);
    expect(cards.filter((c) => c.kind === "vocab")).toHaveLength(6);
    expect(cards.filter((c) => c.kind === "phrase")).toHaveLength(4);
    const err = cards.find((c) => c.kind === "error")!;
    expect(err.front).toBe("He drinks coffee.");
    expect(err.extra).toBe("No digas: He drink coffee.");
    expect(err.error_type).toBe("third_person_s");
  });
});

describe("parseSeedInput", () => {
  it("descarta tarjetas inválidas y errores sin tipo", () => {
    const r = parseSeedInput({
      topic_key: "A1_present_simple",
      cards: [
        { kind: "vocab", front: "wake up", back: "despertarse", extra: "I wake up early." },
        { kind: "hack", front: "x", back: "y" },
        { kind: "error", front: "He drinks", back: "Forma correcta", error_type: null },
        { kind: "vocab", front: "   ", back: "vacío" },
      ],
    });
    expect(r.ok && r.value.cards).toHaveLength(1);
  });
  it("rechaza temas inválidos", () => {
    expect(parseSeedInput({ topic_key: "x", cards: [] }).ok).toBe(false);
  });
});

describe("parseGradeInput", () => {
  it("acepta solo again, good y easy", () => {
    expect(parseGradeInput({ id: 5, rating: "good" }).ok).toBe(true);
    expect(parseGradeInput({ id: 5, rating: "hard" }).ok).toBe(false);
    expect(parseGradeInput({ id: -1, rating: "good" }).ok).toBe(false);
  });
});
