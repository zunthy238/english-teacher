// lib/today-plan.ts
// Plan del día (función pura, probada): saludo, meta, siguiente tema y estado de la sesión.
import { bogotaDate } from "./progress-summary";

export type TodayPlan = {
  greeting: string;
  dateLabel: string;
  goalMinutes: number;
  todayMinutes: number;
  goalPct: number; // 0-100
  goalDone: boolean;
  studiedToday: boolean;
  streak: number;
  level: string;
  topic: { title: string; position: number; total: number } | null;
  allDone: boolean;
};

export function bogotaHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23" }).format(now),
  );
}

export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 19) return "Good afternoon";
  return "Good evening";
}

export function buildTodayPlan(input: {
  now: Date;
  level: string;
  goalMinutes: number;
  streak: number;
  sessions: { created_at: string; minutes: number | null }[];
  topics: { topic_key: string; title: string; position: number }[];
  completed: string[];
}): TodayPlan {
  const today = bogotaDate(input.now);
  const todaySessions = input.sessions.filter((s) => bogotaDate(new Date(s.created_at)) === today);
  const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const goal = Math.max(5, input.goalMinutes);
  const done = new Set(input.completed);
  const sorted = [...input.topics].sort((a, b) => a.position - b.position);
  const next = sorted.find((t) => !done.has(t.topic_key));
  const dateLabel = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(input.now);

  return {
    greeting: greetingFor(bogotaHour(input.now)),
    dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
    goalMinutes: goal,
    todayMinutes,
    goalPct: Math.min(100, Math.round((todayMinutes / goal) * 100)),
    goalDone: todayMinutes >= goal,
    studiedToday: todaySessions.length > 0,
    streak: input.streak,
    level: input.level,
    topic: next ? { title: next.title, position: next.position, total: sorted.length } : null,
    allDone: sorted.length > 0 && !next,
  };
}
