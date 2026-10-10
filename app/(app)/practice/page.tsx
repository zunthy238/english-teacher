// app/(app)/practice/page.tsx
// Hablar (Fase D): repetir como nativo con frases de tu historia + conversaciones por voz.
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PROMPT_VERSION } from "@/lib/prompts/version";
import { FALLBACK_LINES, pickShadowLines } from "@/lib/speak/shadow";
import { SpeakHub } from "@/components/speak/speak-hub";
import type { CefrLevel } from "@/lib/schemas/lesson";
import type { Story } from "@/lib/schemas/story";

async function SpeakData() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (typeof auth?.claims?.sub !== "string") return null;

  const { data: profile } = await supabase
    .from("profile")
    .select("cefr_level, goals, job_title")
    .eq("id", auth.claims.sub)
    .maybeSingle();
  const level = (profile?.cefr_level ?? "A1") as CefrLevel;

  // Frases: de la historia del tema actual (o del último tema con historia); si no hay, frases útiles del nivel
  const [topics, progress] = await Promise.all([
    supabase.from("curriculum").select("topic_key, position").eq("cefr_level", level).order("position"),
    supabase.from("user_topic_progress").select("topic_key, completed_at").eq("completed", true).order("completed_at", { ascending: false }),
  ]);
  const completed = (progress.data ?? []).map((r) => r.topic_key);
  const next = (topics.data ?? []).find((t) => !completed.includes(t.topic_key))?.topic_key;
  const keys = [...(next ? [next] : []), ...completed].slice(0, 10);
  const { data: stories } = keys.length
    ? await supabase
        .from("lessons_cache")
        .select("cache_key, content")
        .eq("kind", "story")
        .eq("prompt_version", PROMPT_VERSION)
        .in("cache_key", keys)
    : { data: [] };
  const byKey = new Map((stories ?? []).map((s) => [s.cache_key as string, s.content as Story]));
  const storyKey = keys.find((k) => byKey.has(k));
  const story = storyKey ? byKey.get(storyKey)! : null;
  const fromStory = story ? pickShadowLines(story) : [];
  const lines = fromStory.length >= 3 ? fromStory : FALLBACK_LINES[level];

  return (
    <SpeakHub
      goals={profile?.goals ?? ["daily"]}
      jobTitle={profile?.job_title ?? null}
      lines={lines}
      source={fromStory.length >= 3 && story ? `de "${story.title}"` : `frases útiles ${level}`}
    />
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-[24px] bg-line" />}>
      <SpeakData />
    </Suspense>
  );
}
