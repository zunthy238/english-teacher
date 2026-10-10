// lib/today-plan.test.ts
import { describe, it, expect } from "vitest";
import { buildTodayPlan, greetingFor, bogotaHour } from "./today-plan";

// Sábado 10 oct 2026, 11:30 a. m. en Bogotá (16:30 UTC)
const now = new Date("2026-10-10T16:30:00Z");
const topics = [
  { topic_key: "A1_b", title: "Numbers", position: 2 },
  { topic_key: "A1_a", title: "Verb to be", position: 1 },
  { topic_key: "A1_c", title: "Present simple", position: 3 },
];
const base = { now, level: "A1", goalMinutes: 30, streak: 3, sessions: [], topics, completed: [] as string[] };

describe("greeting", () => {
  it("usa la hora de Colombia", () => {
    expect(bogotaHour(now)).toBe(11);
    expect(greetingFor(8)).toBe("Good morning");
    expect(greetingFor(15)).toBe("Good afternoon");
    expect(greetingFor(21)).toBe("Good evening");
  });
});

describe("buildTodayPlan", () => {
  it("elige el primer tema sin completar, en orden", () => {
    expect(buildTodayPlan(base).topic).toEqual({ title: "Verb to be", position: 1, total: 3 });
    expect(buildTodayPlan({ ...base, completed: ["A1_a"] }).topic?.title).toBe("Numbers");
  });

  it("suma solo los minutos de hoy y calcula la meta", () => {
    const p = buildTodayPlan({
      ...base,
      sessions: [
        { created_at: "2026-10-10T14:00:00Z", minutes: 12 },
        { created_at: "2026-10-10T15:00:00Z", minutes: 6 },
        { created_at: "2026-10-09T15:00:00Z", minutes: 40 }, // ayer
      ],
    });
    expect(p.todayMinutes).toBe(18);
    expect(p.goalPct).toBe(60);
    expect(p.goalDone).toBe(false);
    expect(p.studiedToday).toBe(true);
  });

  it("marca la meta cumplida y el nivel terminado", () => {
    const p = buildTodayPlan({
      ...base,
      completed: ["A1_a", "A1_b", "A1_c"],
      sessions: [{ created_at: "2026-10-10T14:00:00Z", minutes: 35 }],
    });
    expect(p.goalDone).toBe(true);
    expect(p.goalPct).toBe(100);
    expect(p.allDone).toBe(true);
    expect(p.topic).toBeNull();
  });

  it("muestra la fecha en español", () => {
    expect(buildTodayPlan(base).dateLabel).toMatch(/^Sábado/);
  });
});
