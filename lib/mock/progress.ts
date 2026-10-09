// lib/mock/progress.ts
// Progreso de prueba (CP-0.5). Campos alineados con schema.sql; en CP-4 vendrán de Supabase.
import type { CefrLevel } from "@/lib/schemas/lesson";

export type ErrorSummary = {
  error_type: string;
  example_wrong: string;
  example_right: string;
  count: number;
};

export type ProgressSummary = {
  cefr_level: CefrLevel;
  topics_completed: number;
  topics_total: number;
  streak_days: number;
  daily_goal_minutes: number;
  week: { day: string; minutes: number }[];
  top_errors: ErrorSummary[];
};

export const MOCK_PROGRESS: ProgressSummary = {
  cefr_level: "A1",
  topics_completed: 2,
  topics_total: 25,
  streak_days: 4,
  daily_goal_minutes: 60,
  week: [
    { day: "Lun", minutes: 45 },
    { day: "Mar", minutes: 60 },
    { day: "Mié", minutes: 30 },
    { day: "Jue", minutes: 60 },
    { day: "Vie", minutes: 15 },
    { day: "Sáb", minutes: 0 },
    { day: "Dom", minutes: 0 },
  ],
  top_errors: [
    { error_type: "third_person_s", example_wrong: "He drink coffee.", example_right: "He drinks coffee.", count: 7 },
    { error_type: "verb_to_be_agreement", example_wrong: "They is from New York.", example_right: "They are from New York.", count: 5 },
    { error_type: "question_word_order", example_wrong: "You are busy now?", example_right: "Are you busy now?", count: 4 },
    { error_type: "auxiliary_do_does", example_wrong: "Do she live in Miami?", example_right: "Does she live in Miami?", count: 3 },
    { error_type: "adverb_position", example_wrong: "I wake up usually at seven.", example_right: "I usually wake up at seven.", count: 2 },
  ],
};