// app/(app)/progress/page.tsx
// CP-4: datos reales del usuario. Se lee con su sesión (RLS): cada quien ve solo lo suyo.
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildSummary, type ErrorSummary } from "@/lib/progress-summary";
import { ProgressView } from "@/components/progress/progress-view";
import type { CefrLevel } from "@/lib/schemas/lesson";

async function ProgressData() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (typeof userId !== "string") return null;

  const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const { data: profile } = await supabase
    .from("profile")
    .select("cefr_level, daily_minutes")
    .eq("id", userId)
    .maybeSingle();
  const level = (profile?.cefr_level ?? "A1") as CefrLevel;

  const [total, completed, sessions, errors] = await Promise.all([
    supabase.from("curriculum").select("*", { count: "exact", head: true }).eq("cefr_level", level),
    supabase
      .from("user_topic_progress")
      .select("topic_key, curriculum!inner(cefr_level)", { count: "exact", head: true })
      .eq("completed", true)
      .eq("curriculum.cefr_level", level),
    supabase.from("sessions").select("created_at, minutes").gte("created_at", since),
    supabase
      .from("errors")
      .select("error_type, example_wrong, example_right, count")
      .eq("resolved", false)
      .order("count", { ascending: false })
      .limit(5),
  ]);

  const summary = buildSummary({
    now: new Date(),
    cefr_level: level,
    daily_goal_minutes: profile?.daily_minutes ?? 60,
    topics_total: total.count ?? 0,
    topics_completed: completed.count ?? 0,
    sessions: sessions.data ?? [],
    top_errors: (errors.data ?? []) as ErrorSummary[],
  });

  return <ProgressView p={summary} />;
}

function ProgressSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="h-16 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
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
