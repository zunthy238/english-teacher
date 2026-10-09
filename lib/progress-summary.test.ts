// lib/progress-summary.test.ts
import { describe, it, expect } from "vitest";
import { buildSummary, bogotaDate } from "./progress-summary";

// Viernes 9 oct 2026, 10:00 a. m. en Bogotá (15:00 UTC)
const now = new Date("2026-10-09T15:00:00Z");
const base = { now, cefr_level: "A1" as const, daily_goal_minutes: 60, topics_total: 25, topics_completed: 2, top_errors: [] };

describe("bogotaDate", () => {
  it("usa la hora de Colombia, no UTC", () => {
    // 2:00 a. m. UTC del 10 de oct = 9:00 p. m. del 9 de oct en Bogotá
    expect(bogotaDate(new Date("2026-10-10T02:00:00Z"))).toBe("2026-10-09");
  });
});

describe("buildSummary", () => {
  it("suma minutos por día en los últimos 7 días terminando hoy", () => {
    const s = buildSummary({
      ...base,
      sessions: [
        { created_at: "2026-10-09T14:00:00Z", minutes: 10 },
        { created_at: "2026-10-09T16:00:00Z", minutes: 15 },
        { created_at: "2026-10-07T14:00:00Z", minutes: 30 },
        { created_at: "2026-09-01T14:00:00Z", minutes: 99 }, // fuera de la semana
      ],
    });
    expect(s.week).toHaveLength(7);
    expect(s.week[6]).toEqual({ day: "Vie", minutes: 25 });
    expect(s.week[4]).toEqual({ day: "Mié", minutes: 30 });
    expect(s.week.reduce((a, d) => a + d.minutes, 0)).toBe(55);
  });

  it("calcula la racha de días seguidos", () => {
    const day = (d: string) => ({ created_at: `${d}T15:00:00Z`, minutes: 5 });
    expect(buildSummary({ ...base, sessions: [day("2026-10-09"), day("2026-10-08"), day("2026-10-07")] }).streak_days).toBe(3);
    // Hoy sin estudiar todavía: la racha de ayer se mantiene
    expect(buildSummary({ ...base, sessions: [day("2026-10-08"), day("2026-10-07")] }).streak_days).toBe(2);
    // Un día sin estudiar rompe la racha
    expect(buildSummary({ ...base, sessions: [day("2026-10-09"), day("2026-10-07")] }).streak_days).toBe(1);
    expect(buildSummary({ ...base, sessions: [] }).streak_days).toBe(0);
  });
});
