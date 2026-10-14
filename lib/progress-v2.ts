// lib/progress-v2.ts
// Progreso 2.0: tu camino de nivel, "Ya puedo…", tiempo por actividad y subida de nivel (funciones puras, probadas).
import type { CefrLevel } from "./schemas/lesson";

export const LEVEL_ORDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];

export function nextLevel(level: CefrLevel): CefrLevel | null {
  const i = LEVEL_ORDER.indexOf(level);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null;
}

export type ActivityKey = "lessons" | "writing" | "voice";
export const ACTIVITY_LABEL: Record<ActivityKey, string> = {
  lessons: "Lecciones y chat",
  writing: "Escritura",
  voice: "Conversación",
};

export type ProgressV2 = {
  level: CefrLevel;
  next: CefrLevel | null;
  startLevel: CefrLevel;
  journey: { date: string; level: CefrLevel }[];
  topicsTotal: number;
  topicsDone: number;
  canDo: string[]; // títulos de temas dominados del nivel actual
  nextTopic: string | null;
  levelComplete: boolean;
  activity: { key: ActivityKey; minutes: number }[];
  monthMinutes: number;
};

export function activityOf(s: { mode: string; summary: string | null }): ActivityKey {
  if (s.mode === "voice") return "voice";
  if (s.summary === "writing") return "writing";
  return "lessons";
}

export function buildProgressV2(input: {
  level: CefrLevel;
  topics: { topic_key: string; title: string; position: number }[];
  completed: string[];
  placements: { created_at: string; level: string; start_level: string }[]; // en orden de fecha
  sessions: { mode: string; summary: string | null; minutes: number | null }[];
}): ProgressV2 {
  const done = new Set(input.completed);
  const sorted = [...input.topics].sort((a, b) => a.position - b.position);
  const canDo = sorted.filter((t) => done.has(t.topic_key)).map((t) => t.title);
  const next = sorted.find((t) => !done.has(t.topic_key));
  const minutes: Record<ActivityKey, number> = { lessons: 0, writing: 0, voice: 0 };
  for (const s of input.sessions) minutes[activityOf(s)] += s.minutes ?? 0;
  const first = input.placements[0];
  return {
    level: input.level,
    next: nextLevel(input.level),
    startLevel: ((first?.start_level as CefrLevel) ?? "A1"),
    journey: input.placements.map((p) => ({ date: p.created_at.slice(0, 10), level: p.start_level as CefrLevel })),
    topicsTotal: sorted.length,
    topicsDone: canDo.length,
    canDo,
    nextTopic: next?.title ?? null,
    levelComplete: sorted.length > 0 && !next,
    activity: (Object.keys(minutes) as ActivityKey[]).map((key) => ({ key, minutes: minutes[key] })),
    monthMinutes: Object.values(minutes).reduce((a, b) => a + b, 0),
  };
}
