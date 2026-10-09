// lib/evaluate-validate.test.ts
import { describe, it, expect } from "vitest";
import { validateEvaluation, parseWritingInput } from "./evaluate-validate";

const good = {
  corrections: [
    { wrong: "I has", right: "I have", explanation: "Con I se usa have.", error_type: "Verb Agreement" },
    { wrong: "same", right: "same", explanation: "x", error_type: "x" }, // no cambia nada: se descarta
  ],
  improved_version: "I have a meeting today.",
  score: 104,
  strengths: ["Buen vocabulario", "Frases cortas", "Extra"],
  next_focus: "Concordancia del verbo",
};

describe("validateEvaluation", () => {
  it("normaliza error_type, limita score y descarta correcciones vacías", () => {
    const r = validateEvaluation(good);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.score).toBe(100);
    expect(r.value.corrections).toEqual([
      { wrong: "I has", right: "I have", explanation: "Con I se usa have.", error_type: "verb_agreement" },
    ]);
    expect(r.value.strengths).toHaveLength(2);
  });

  it("acepta un texto sin errores", () => {
    const r = validateEvaluation({ ...good, corrections: [] });
    expect(r.ok && r.value.corrections).toEqual([]);
  });

  it("rechaza respuestas incompletas", () => {
    expect(validateEvaluation({ ...good, improved_version: "" }).ok).toBe(false);
    expect(validateEvaluation(null).ok).toBe(false);
  });
});

describe("parseWritingInput", () => {
  const ok = { topic_key: "A1_verb_to_be", task: "Preséntate", text: "Hi, I am Jhota. I am from Colombia." };
  it("acepta un texto válido", () => {
    expect(parseWritingInput(ok).ok).toBe(true);
  });
  it("rechaza textos muy cortos o muy largos", () => {
    expect(parseWritingInput({ ...ok, text: "Hi" }).ok).toBe(false);
    expect(parseWritingInput({ ...ok, text: "word ".repeat(500) }).ok).toBe(false);
  });
  it("rechaza temas inválidos", () => {
    expect(parseWritingInput({ ...ok, topic_key: "x" }).ok).toBe(false);
  });
});
