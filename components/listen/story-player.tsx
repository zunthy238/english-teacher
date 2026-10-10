"use client";
// components/listen/story-player.tsx
// Reproduce una historia de la biblioteca con los mismos 4 pasos de la sesión. Gratis: la historia ya está en caché.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Headphones, Loader2, RotateCcw, X } from "lucide-react";
import type { Story } from "@/lib/schemas/story";
import { buildStorySteps } from "@/lib/session-plan";
import { stopSpeech } from "@/components/lesson/speech";
import { StoryDictation, StoryListen, StoryQuestion, StoryTranscript, storyBtn } from "./story-steps";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; story: Story };

export function StoryPlayer() {
  const params = useParams<{ topic: string }>();
  const topic = params?.topic ?? "";
  const [state, setState] = useState<State>({ status: "loading" });
  const [i, setI] = useState(0);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const [run, setRun] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(`/api/story?topic=${encodeURIComponent(topic)}`, { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!alive) return;
        setState(r.ok ? { status: "ready", story: b.story } : { status: "error", message: b.error ?? "No se pudo cargar la historia." });
      })
      .catch(() => alive && setState({ status: "error", message: "Sin conexión. Revisa tu internet." }));
    return () => {
      alive = false;
      stopSpeech();
    };
  }, [topic]);

  const steps = useMemo(() => (state.status === "ready" ? buildStorySteps(state.story) : []), [state]);

  function next(correct?: boolean) {
    stopSpeech();
    if (typeof correct === "boolean") setScore((s) => ({ ok: s.ok + Number(correct), total: s.total + 1 }));
    setI((n) => n + 1);
    window.scrollTo({ top: 0 });
  }

  const header = (pct: number, label: string) => (
    <div className="flex items-center gap-3 px-5 pb-2 pt-[max(16px,env(safe-area-inset-top))]">
      <Link href="/listen" aria-label="Volver a Historias" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">
        <X className="size-5" aria-hidden strokeWidth={2.6} />
      </Link>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-listen transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-sm font-bold text-muted">{label}</span>
    </div>
  );

  let body: React.ReactNode;
  if (state.status === "loading") {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="size-10 animate-spin text-listen" aria-hidden />
        <p className="font-display text-xl font-extrabold">Cargando la historia…</p>
      </div>
    );
  } else if (state.status === "error") {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="font-display text-xl font-extrabold">No se pudo cargar</p>
        <p className="text-muted">{state.message}</p>
      </div>
    );
  } else {
    const story = state.story;
    const step = steps[i];
    body = (
      <div key={`${run}-${i}`} className="flex flex-1 flex-col overflow-y-auto px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 pm-rise">
        {!step ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <span className="flex size-24 items-center justify-center rounded-full bg-listen text-white">
              <Headphones className="size-11" aria-hidden strokeWidth={2.2} />
            </span>
            <h2 className="font-display text-3xl font-extrabold">¡Historia completada!</h2>
            <p className="text-lg text-muted">
              {score.ok} de {score.total} correctas
            </p>
            <div className="mt-4 flex w-full flex-col gap-3">
              <Link href="/listen" className={`${storyBtn} bg-ink text-white`}>
                Otra historia
              </Link>
              <button
                type="button"
                className={`${storyBtn} bg-white text-ink`}
                onClick={() => {
                  setI(0);
                  setScore({ ok: 0, total: 0 });
                  setRun((r) => r + 1);
                }}
              >
                <RotateCcw className="size-5" aria-hidden /> Escucharla otra vez
              </button>
            </div>
          </div>
        ) : step.kind === "story_listen" ? (
          <StoryListen story={story} onNext={() => next()} />
        ) : step.kind === "story_question" ? (
          <StoryQuestion story={story} index={step.index} onNext={next} />
        ) : step.kind === "story_transcript" ? (
          <StoryTranscript story={story} topicKey={topic} onNext={() => next()} />
        ) : step.kind === "story_dictation" ? (
          <StoryDictation story={story} index={step.index} onNext={next} />
        ) : null}
      </div>
    );
  }

  const pct = steps.length ? Math.round((Math.min(i, steps.length) / steps.length) * 100) : 0;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-canvas text-ink">
      <div className="mx-auto flex h-full w-full max-w-xl flex-col">
        {header(pct, steps.length ? `${Math.min(i + 1, steps.length)}/${steps.length}` : "")}
        {body}
      </div>
    </div>
  );
}
