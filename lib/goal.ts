// lib/goal.ts
// Meta diaria: opciones, validación y cálculo de "meta cumplida" (funciones puras, probadas).
import { bogotaDate } from "./progress-summary";

export const GOAL_OPTIONS = [10, 15, 20, 30, 45, 60] as const;

export function parseGoalInput(body: unknown): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida." };
  const v = (body as Record<string, unknown>).daily_minutes;
  if (typeof v !== "number" || !(GOAL_OPTIONS as readonly number[]).includes(v)) {
    return { ok: false, error: "Elige una meta válida." };
  }
  return { ok: true, value: v };
}

// Suma los minutos de HOY (hora de Colombia) y dice si esta sesión fue la que cumplió la meta
export function goalStatus(input: {
  now: Date;
  goal: number;
  sessionMinutes: number;
  sessions: { created_at: string; minutes: number | null }[];
}) {
  const today = bogotaDate(input.now);
  const todayMinutes = input.sessions
    .filter((s) => bogotaDate(new Date(s.created_at)) === today)
    .reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const reached = todayMinutes >= input.goal;
  const justReached = reached && todayMinutes - input.sessionMinutes < input.goal;
  return { todayMinutes, goal: input.goal, reached, justReached };
}
