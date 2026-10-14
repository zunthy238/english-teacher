// app/(app)/progress/page.tsx
// Progreso 2.0: datos reales del usuario, leídos con su sesión (RLS). No usa IA.
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildSummary, type ErrorSummary } from "@/lib/progress-summary";
import { buildProgressV2 } from "@/lib/progress-v2";
import { ProgressView } from "@/components/progress/progress-view";
import type { CefrLevel } from "@/lib/schemas/lesson";

async function ProgressData() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (typeof userId !== "string") return null;

  const { data: profile } = await supabase.from("profile").select("cefr_level, daily_minutes").eq("id", userId).maybeSingle();
  const level = (profile?.cefr_level ?? "A1") as CefrLevel;
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [topics, completed, sessions, errors, placements, reviewDue, reviewTotal] = await Promise.all([
    supabase.from("curriculum").select("topic_key, title, position").eq("cefr_level", level),
    supabase.from("user_topic_progress").select("topic_key").eq("completed", true),
    supabase.from("sessions").select("created_at, minutes, mode, summary").gte("created_at", since),
    supabase
      .from("errors")
      .select("error_type, example_wrong, example_right, count")
      .eq("resolved", false)
      .order("count", { ascending: false })
      .limit(5),
    supabase.from("placement_tests").select("created_at, level, start_level").order("created_at"),
    supabase.from("review_cards").select("*", { count: "exact", head: true }).lte("due_at", now.toISOString()),
    supabase.from("review_cards").select("*", { count: "exact", head: true }),
  ]);

  const sessionRows = sessions.data ?? [];
  const summary = buildSummary({
    now,
    cefr_level: level,
    daily_goal_minutes: profile?.daily_minutes ?? 30,
    topics_total: 0,
    topics_completed: 0,
    sessions: sessionRows,
    top_errors: (errors.data ?? []) as ErrorSummary[],
  });
  const v2 = buildProgressV2({
    level,
    topics: topics.data ?? [],
    completed: (completed.data ?? []).map((r) => r.topic_key),
    placements: placements.data ?? [],
    sessions: sessionRows,
  });

  return <ProgressView p={summary} v2={v2} review={{ due: reviewDue.count ?? 0, total: reviewTotal.count ?? 0 }} />;
}

function ProgressSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-12 w-48 animate-pulse rounded-xl bg-line" />
      <div className="h-48 animate-pulse rounded-[28px] bg-line" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<ProgressSkeleton />}>
      <ProgressData />
    </Suspense>
  );
}
