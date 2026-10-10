// app/(app)/today/page.tsx
// Hoy = el plan del día (Fase A). La lección vive ahora en /lesson.
// Lee con la sesión del usuario (RLS) y no llama a la IA: abrir Hoy es gratis.
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildSummary } from "@/lib/progress-summary";
import { buildTodayPlan } from "@/lib/today-plan";
import { TodaySkeleton, TodayView } from "@/components/today/today-view";
import type { CefrLevel } from "@/lib/schemas/lesson";

async function TodayData() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (typeof userId !== "string") return null;

  const { data: profile } = await supabase
    .from("profile")
    .select("cefr_level, daily_minutes")
    .eq("id", userId)
    .maybeSingle();
  const level = (profile?.cefr_level ?? "A1") as CefrLevel;
  const since = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

  const [topics, progress, sessions, reviewDue] = await Promise.all([
    supabase.from("curriculum").select("topic_key, title, position").eq("cefr_level", level),
    supabase.from("user_topic_progress").select("topic_key").eq("completed", true),
    supabase.from("sessions").select("created_at, minutes").gte("created_at", since),
    supabase.from("review_cards").select("*", { count: "exact", head: true }).lte("due_at", new Date().toISOString()),
  ]);

  const now = new Date();
  const sessionRows = sessions.data ?? [];
  const summary = buildSummary({
    now,
    cefr_level: level,
    daily_goal_minutes: profile?.daily_minutes ?? 30,
    topics_total: 0,
    topics_completed: 0,
    sessions: sessionRows,
    top_errors: [],
  });

  const plan = buildTodayPlan({
    now,
    level,
    goalMinutes: profile?.daily_minutes ?? 30,
    streak: summary.streak_days,
    sessions: sessionRows,
    topics: topics.data ?? [],
    completed: (progress.data ?? []).map((r) => r.topic_key),
  });

  return <TodayView plan={plan} reviewDue={reviewDue.count ?? 0} />;
}

export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <TodayData />
    </Suspense>
  );
}
