// lib/goal.test.ts
import { describe, it, expect } from "vitest";
import { goalStatus, parseGoalInput } from "./goal";

const now = new Date("2026-10-10T22:00:00Z"); // 5:00 p. m. en Bogotá

describe("parseGoalInput", () => {
  it("acepta solo las opciones de la lista", () => {
    expect(parseGoalInput({ daily_minutes: 20 })).toEqual({ ok: true, value: 20 });
    expect(parseGoalInput({ daily_minutes: 17 }).ok).toBe(false);
    expect(parseGoalInput({ daily_minutes: "20" }).ok).toBe(false);
  });
});

describe("goalStatus", () => {
  const sessions = [
    { created_at: "2026-10-10T14:00:00Z", minutes: 12 },
    { created_at: "2026-10-10T21:50:00Z", minutes: 10 }, // la sesión que acaba de terminar
    { created_at: "2026-10-09T20:00:00Z", minutes: 40 }, // ayer: no cuenta
  ];
  it("detecta que esta sesión cumplió la meta", () => {
    const s = goalStatus({ now, goal: 20, sessionMinutes: 10, sessions });
    expect(s).toEqual({ todayMinutes: 22, goal: 20, reached: true, justReached: true });
  });
  it("si ya estaba cumplida, no la vuelve a celebrar", () => {
    const s = goalStatus({ now, goal: 10, sessionMinutes: 10, sessions });
    expect(s.reached).toBe(true);
    expect(s.justReached).toBe(false);
  });
  it("meta aún no cumplida", () => {
    expect(goalStatus({ now, goal: 30, sessionMinutes: 10, sessions }).reached).toBe(false);
  });
});
