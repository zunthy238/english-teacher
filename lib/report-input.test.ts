// lib/report-input.test.ts
import { describe, it, expect } from "vitest";
import { parseReportInput } from "./report-input";

const ok = {
  topic_key: "A1_greetings",
  variant: 1,
  exercise_id: "e3",
  exercise: { type: "fill_blank", prompt: "She ___ (not/go) to the gym.", answer: "does not go" },
  user_answer: "doesn't go",
  reason: "my_answer_valid",
  comment: "  Las contracciones son válidas  ",
};

describe("parseReportInput", () => {
  it("acepta un reporte válido y limpia el comentario", () => {
    const r = parseReportInput(ok);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.comment).toBe("Las contracciones son válidas");
  });
  it("rechaza motivos y temas inválidos", () => {
    expect(parseReportInput({ ...ok, reason: "spam" }).ok).toBe(false);
    expect(parseReportInput({ ...ok, topic_key: "x" }).ok).toBe(false);
  });
  it("comentario vacío queda en null y limita su largo", () => {
    const empty = parseReportInput({ ...ok, comment: "   " });
    expect(empty.ok && empty.value.comment).toBeNull();
    const long = parseReportInput({ ...ok, comment: "a".repeat(900) });
    expect(long.ok && long.value.comment?.length).toBe(500);
  });
});
