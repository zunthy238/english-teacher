import { describe, expect, it } from "vitest";
import { activityOf, buildProgressV2, nextLevel } from "./progress-v2";

const topics = [
  { topic_key: "A1_b", title: "Present simple", position: 2 },
  { topic_key: "A1_a", title: "Saludos", position: 1 },
  { topic_key: "A1_c", title: "Pasado", position: 3 },
];

describe("Progreso 2.0", () => {
  it("lista lo que ya puedes hacer en orden y el siguiente tema", () => {
    const p = buildProgressV2({ level: "A1", topics, completed: ["A1_b", "A1_a"], placements: [], sessions: [] });
    expect(p.canDo).toEqual(["Saludos", "Present simple"]);
    expect(p.nextTopic).toBe("Pasado");
    expect(p.levelComplete).toBe(false);
    expect(p.startLevel).toBe("A1");
  });
  it("detecta el nivel completo para ofrecer la prueba de subida", () => {
    const p = buildProgressV2({ level: "A1", topics, completed: ["A1_a", "A1_b", "A1_c"], placements: [], sessions: [] });
    expect(p.levelComplete).toBe(true);
    expect(p.next).toBe("A2");
  });
  it("C1 no tiene nivel siguiente", () => {
    expect(nextLevel("C1")).toBeNull();
  });
  it("muestra el camino de nivel y el tiempo por actividad", () => {
    const p = buildProgressV2({
      level: "A2",
      topics,
      completed: [],
      placements: [
        { created_at: "2026-10-10T10:00:00Z", level: "A2", start_level: "A1" },
        { created_at: "2026-11-20T10:00:00Z", level: "A2", start_level: "A2" },
      ],
      sessions: [
        { mode: "text", summary: null, minutes: 20 },
        { mode: "text", summary: "writing", minutes: 0 },
        { mode: "voice", summary: "roleplay:coffee_shop", minutes: 6 },
      ],
    });
    expect(p.startLevel).toBe("A1");
    expect(p.journey.map((j) => j.level)).toEqual(["A1", "A2"]);
    expect(p.activity.find((a) => a.key === "voice")?.minutes).toBe(6);
    expect(p.monthMinutes).toBe(26);
  });
  it("clasifica las sesiones", () => {
    expect(activityOf({ mode: "voice", summary: null })).toBe("voice");
    expect(activityOf({ mode: "text", summary: "writing" })).toBe("writing");
    expect(activityOf({ mode: "text", summary: null })).toBe("lessons");
  });
});
