// lib/progress-summary.ts
// Calcula el resumen de la pantalla Progreso a partir de los datos reales (función pura, probada).
import type { CefrLevel } from "./schemas/lesson";

export type ErrorSummary = { error_type: string; example_wrong: string; example_right: string; count: number };

export type ProgressSummary = {
  cefr_level: CefrLevel;
  topics_completed: number;
  topics_total: number;
  streak_days: number;
  daily_goal_minutes: number;
  week: { day: string; minutes: number }[];
  top_errors: ErrorSummary[];
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Fecha AAAA-MM-DD en hora de Colombia
export function bogotaDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildSummary(input: {
  now: Date;
  cefr_level: CefrLevel;
  daily_goal_minutes: number;
  topics_total: number;
  topics_completed: number;
  sessions: { created_at: string; minutes: number | null }[];
  top_errors: ErrorSummary[];
}): ProgressSummary {
  const today = bogotaDate(input.now);

  const minutesByDay = new Map<string, number>();
  for (const s of input.sessions) {
    const day = bogotaDate(new Date(s.created_at));
    minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + (s.minutes ?? 0));
  }

  // Últimos 7 días, terminando hoy
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    return { day: DAY_LABELS[weekday], minutes: minutesByDay.get(day) ?? 0 };
  });

  // Racha: días seguidos con al menos una sesión (si hoy aún no estudia, cuenta desde ayer)
  let streak = 0;
  let cursor = minutesByDay.has(today) ? today : addDays(today, -1);
  while (minutesByDay.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    cefr_level: input.cefr_level,
    topics_completed: input.topics_completed,
    topics_total: input.topics_total,
    streak_days: streak,
    daily_goal_minutes: input.daily_goal_minutes,
    week,
    top_errors: input.top_errors,
  };
}
