// app/(app)/listen/page.tsx
// Biblioteca "Historias": vuelve a escuchar las historias de tus temas, gratis (no usa IA).
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Headphones } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PROMPT_VERSION } from "@/lib/prompts/version";
import { buildLibrary, listeningIsWeak } from "@/lib/listen-library";
import type { Story } from "@/lib/schemas/story";

async function Library() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (typeof auth?.claims?.sub !== "string") return null;

  const { data: profile } = await supabase.from("profile").select("cefr_level").eq("id", auth.claims.sub).maybeSingle();
  const level = profile?.cefr_level ?? "A1";
  const [topics, progress, placement] = await Promise.all([
    supabase.from("curriculum").select("topic_key, title, position").eq("cefr_level", level).order("position"),
    supabase.from("user_topic_progress").select("topic_key").eq("completed", true),
    supabase.from("placement_tests").select("skills").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const completed = (progress.data ?? []).map((r) => r.topic_key);
  const next = (topics.data ?? []).find((t) => !completed.includes(t.topic_key))?.topic_key ?? null;
  const keys = [...completed, ...(next ? [next] : [])];
  const { data: stories } = keys.length
    ? await supabase
        .from("lessons_cache")
        .select("cache_key, content")
        .eq("kind", "story")
        .eq("prompt_version", PROMPT_VERSION)
        .in("cache_key", keys)
    : { data: [] };

  const items = buildLibrary({
    stories: (stories ?? []) as { cache_key: string; content: Story }[],
    topics: topics.data ?? [],
    completed,
    nextTopic: next,
  });
  const weak = listeningIsWeak(placement.data?.skills as Record<string, { pct?: number }> | undefined);

  return (
    <div className="space-y-4">
      {weak && (
        <p className="rounded-[20px] bg-learn px-5 py-4 font-bold text-ink pm-rise">
          🎯 Tu prueba de nivel mostró que la escucha es tu punto a reforzar: escucha una historia extra cada día.
        </p>
      )}
      {items.length === 0 ? (
        <div className="rounded-[24px] bg-white p-6 text-center pm-rise">
          <p className="text-4xl" aria-hidden>🎧</p>
          <p className="mt-2 font-display text-xl font-extrabold">Aún no hay historias</p>
          <p className="mt-1 text-muted">Haz tu sesión de hoy: cada tema trae su historia y aparecerá aquí.</p>
          <Link href="/lesson" className="mt-4 inline-flex min-h-[50px] items-center gap-2 rounded-2xl bg-ink px-5 font-bold text-white">
            Empezar la sesión <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.topic_key}>
              <Link
                href={`/listen/${it.topic_key}`}
                className="flex items-center gap-4 rounded-[22px] bg-white px-4 py-4 transition-transform active:scale-[0.98] pm-rise"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-listen text-2xl" aria-hidden>
                  {it.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{it.title}</span>
                  <span className="block truncate text-sm text-muted">
                    {it.level}
                    {it.position ? ` · Tema ${it.position}` : ""} · {it.topic_title}
                  </span>
                </span>
                {it.isNew && <span className="rounded-full bg-learn px-2.5 py-1 text-xs font-extrabold">Hoy</span>}
                <Headphones className="size-5 shrink-0 text-listen" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ListenPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1 pm-rise">
        <p className="text-sm font-semibold text-listen">Escuchar</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Historias</h1>
        <p className="text-muted">Diálogos reales de tus temas. Escúchalos en el bus o antes de dormir.</p>
      </header>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-[24px] bg-line" />}>
        <Library />
      </Suspense>
    </div>
  );
}
