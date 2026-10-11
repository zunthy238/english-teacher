"use client";
// components/chat/chat-thread.tsx
// La conversación con Mike: aplica el motor (lib/chat/engine) y muestra la caja de respuesta según el paso.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Headphones, Loader2, Mic, RotateCcw, Send, SkipForward } from "lucide-react";
import type { ClosedExercise, Lesson } from "@/lib/schemas/lesson";
import type { Story } from "@/lib/schemas/story";
import type { Evaluation } from "@/lib/evaluate-validate";
import { buildChatScript, masteryScore, mikeLang } from "@/lib/chat/script";
import {
  answerExercise, answerListen, answerPause, answerProduce, answerRepeat, answerReview, pending, runAuto, skipStep, type Ctx,
} from "@/lib/chat/engine";
import { newChatState, type ChatState } from "@/lib/chat/state";
import { buildErrorExamples } from "@/lib/progress-input";
import { buildSeedCards } from "@/lib/review-input";
import { isClosedExercise } from "@/lib/schemas/lesson";
import type { GradeResult } from "@/lib/grade";
import { speak, speakLines, stopSpeech, vibrate } from "@/components/lesson/speech";
import { Confetti } from "@/components/lesson/confetti";
import { useSpeechInput } from "@/components/speak/use-speech-input";
import { MicButton } from "@/components/speak/mic-button";
import { Bubble, Typing } from "./bubbles";

export type ChatMeta = { topic_key: string; title: string; position: number; total: number; variant: number };
type Goal = { todayMinutes: number; goal: number; reached: boolean; justReached: boolean };

const chip =
  "min-h-[46px] rounded-2xl border-2 border-brand bg-white px-4 py-2 text-left text-[15px] font-extrabold text-brand transition-transform active:scale-[0.97] disabled:opacity-40";

export function ChatThread({
  lesson,
  story,
  meta,
  initial,
  onNextTopic,
}: {
  lesson: Lesson;
  story: Story | null;
  meta: ChatMeta;
  initial: ChatState;
  onNextTopic: () => void;
}) {
  const [state, setState] = useState<ChatState>(initial);
  const [goal, setGoal] = useState<Goal | null>(null);
  const saving = useRef(false);
  const lang = mikeLang(lesson.cefr_level);
  const ctx: Ctx = useMemo(
    () => ({ steps: buildChatScript({ lesson, story, level: lesson.cefr_level, review: state.review }), lang, story }),
    // el guion depende solo del contenido y de las tarjetas fijadas al empezar
    [lesson, story, lang, state.review],
  );
  const p = pending(state, ctx);
  const typing = p.type === "auto";
  const bottom = useRef<HTMLDivElement>(null);
  const firstSave = useRef(true);

  // Mike "escribe" sus mensajes uno por uno
  useEffect(() => {
    if (p.type !== "auto") return;
    const timer = setTimeout(() => setState((s) => runAuto(s, ctx)), p.delay);
    return () => clearTimeout(timer);
  }, [p.type, state.pos, state.asked.length, state.retryAnnounced, state.retryAsked, state.retry.length, ctx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar el avance (para retomar la conversación en cualquier momento)
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void fetch("/api/chat-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic_key: meta.topic_key, variant: meta.variant, state }),
      }).catch(() => undefined);
    }, 700);
    return () => clearTimeout(timer);
  }, [state, meta.topic_key, meta.variant]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.log.length, typing, state.finished]);

  // Final del tema: guardar progreso, errores y repaso
  useEffect(() => {
    if (p.type !== "finish" || saving.current) return;
    saving.current = true;
    void (async () => {
      const closed = lesson.exercises.filter(isClosedExercise);
      const results: GradeResult[] = closed
        .filter((e) => e.id in state.first)
        .map((e) => ({
          exerciseId: e.id,
          correct: state.first[e.id],
          expected: e.answer,
          given: state.firstGiven[e.id] ?? "",
          error_type: e.error_type,
        }));
      const errors = buildErrorExamples(lesson.exercises, results);
      const score = masteryScore(state.first, state.recovered);
      if (state.attempt === 0) {
        void fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic_key: meta.topic_key, cards: buildSeedCards(lesson, errors) }),
        }).catch(() => undefined);
      }
      let completed = score >= 80;
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic_key: meta.topic_key,
            score,
            minutes: (Date.now() - state.startedAt) / 60000,
            first_attempt: state.attempt === 0,
            errors,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          completed = body.completed === true;
          setGoal(body.goal ?? null);
        }
      } catch {
        // sin conexión: el resultado se muestra igual; el progreso se guardará al repetir
      }
      vibrate(completed ? [30, 60, 30] : 25);
      setState((s) => ({ ...s, finished: true, score, completed }));
      saving.current = false;
    })();
  }, [p.type]); // eslint-disable-line react-hooks/exhaustive-deps

  function restart() {
    stopSpeech();
    setGoal(null);
    setState(newChatState([], state.attempt + 1));
  }

  const progress = state.finished ? 100 : Math.round((Math.min(state.pos, ctx.steps.length - 1) / (ctx.steps.length - 1)) * 100);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#e9ebf7] text-ink">
      {state.finished && state.completed && goal?.justReached && <Confetti />}
      {/* Encabezado tipo WhatsApp */}
      <header className="bg-ink text-white">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <Link href="/today" aria-label="Volver a Hoy" className="flex size-10 items-center justify-center rounded-full active:bg-white/10">
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <span className="relative flex size-10 items-center justify-center rounded-full bg-brand-soft font-display text-lg font-black text-ink">
            M<i className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-ink bg-[#4ade80]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold leading-tight">Professor Mike</p>
            <p className="truncate text-xs text-[#86efac]">{typing ? "escribiendo…" : `en línea · Tema ${meta.position}: ${meta.title}`}</p>
          </div>
          <div className="w-12 text-right">
            <p className="text-xs font-bold text-[#b9bce6]">{progress}%</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[#4ade80] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundImage: "radial-gradient(#d4d7ee 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-3 py-4">
          {state.attempt > 0 && state.log.length === 0 && (
            <p className="self-center rounded-lg bg-white px-3 py-1 text-xs font-bold text-muted">Intento {state.attempt + 1}</p>
          )}
          {state.log.map((e, i) => (
            <Bubble key={i} entry={e} story={story} />
          ))}
          {typing && <Typing />}
          {state.finished && (
            <DoneCard state={state} goal={goal} lang={lang} onNext={onNextTopic} onRestart={restart} last={meta.position >= meta.total} />
          )}
          <div ref={bottom} className="h-1" />
        </div>
      </div>

      {/* Caja de respuesta */}
      {!state.finished && (
        <div className="border-t border-line bg-white">
          <div className="mx-auto w-full max-w-xl px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5">
            {p.type === "wait" ? (
              <Composer key={`${state.pos}-${state.retryAsked ?? ""}`} state={state} setState={setState} ctx={ctx} p={p} topicKey={meta.topic_key} />
            ) : (
              <p className="flex min-h-[46px] items-center justify-center gap-2 text-sm text-muted">
                {p.type === "finish" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {p.type === "finish" ? "Guardando tu progreso…" : "Mike está escribiendo…"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DoneCard({ state, goal, lang, onNext, onRestart, last }: {
  state: ChatState;
  goal: Goal | null;
  lang: "es" | "en";
  onNext: () => void;
  onRestart: () => void;
  last: boolean;
}) {
  const es = lang === "es";
  const done = state.completed;
  return (
    <div className="mt-2 flex flex-col gap-3 rounded-[22px] bg-ink p-5 text-white pm-pop">
      <p className="text-4xl" aria-hidden>{done ? "🎉" : "💪"}</p>
      <p className="font-display text-2xl font-extrabold">
        {done ? (es ? "¡Tema dominado!" : "Topic mastered!") : es ? "¡Casi lo dominas!" : "Almost there!"}
      </p>
      <p className="text-[#d6d8f5]">
        {es ? "Dominio" : "Mastery"}: <b className="text-white">{state.score ?? 0}%</b>
        {done
          ? es ? " · avanzas al siguiente tema." : " · you can move on."
          : es ? " · necesitas 80 % para avanzar. Repítelo: lo que fallaste ya está en tu repaso." : " · you need 80% to move on."}
      </p>
      {goal && (
        <p className="rounded-xl bg-ink-soft px-3 py-2 text-sm">
          {goal.reached ? "🔥 " : "⏱ "}
          {goal.todayMinutes} de {goal.goal} min hoy{goal.justReached ? " · ¡meta cumplida!" : ""}
        </p>
      )}
      {done && !last ? (
        <button type="button" onClick={onNext} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-brand-soft font-extrabold text-ink">
          {es ? "Siguiente tema" : "Next topic"} <ArrowRight className="size-5" aria-hidden />
        </button>
      ) : (
        <button type="button" onClick={onRestart} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-brand-soft font-extrabold text-ink">
          <RotateCcw className="size-5" aria-hidden /> {es ? "Repetir el tema" : "Repeat the topic"}
        </button>
      )}
      <Link href="/today" className="flex min-h-[48px] items-center justify-center rounded-2xl bg-ink-soft font-bold">
        {es ? "Volver a Hoy" : "Back to Today"}
      </Link>
    </div>
  );
}

/* ---------------- Caja de respuesta según el paso ---------------- */

function Composer({ state, setState, ctx, p, topicKey }: {
  state: ChatState;
  setState: React.Dispatch<React.SetStateAction<ChatState>>;
  ctx: Ctx;
  p: Extract<ReturnType<typeof pending>, { type: "wait" }>;
  topicKey: string;
}) {
  const step = p.step;
  const es = ctx.lang === "es";

  if (step.kind === "pause") {
    return (
      <div className="flex justify-end">
        <button type="button" className={chip} onClick={() => setState((s) => answerPause(s, step.label))}>
          {step.label}
        </button>
      </div>
    );
  }

  if (step.kind === "exercise" || step.kind === "retry") {
    const ex = step.kind === "exercise" ? step.exercise : p.retryExercise;
    if (!ex) return null;
    return (
      <ExerciseInput
        ex={ex}
        onAnswer={(given) => {
          const r = answerExercise(state, ctx, given);
          setState(r.state);
          vibrate(r.correct ? 25 : [40, 60, 40]);
          if (r.sentence) speak(r.sentence);
        }}
      />
    );
  }

  if (step.kind === "listen" && ctx.story) {
    const q = ctx.story.questions[step.q];
    const story = ctx.story;
    return (
      <div className="flex flex-col gap-2">
        {q.options.map((o) => (
          <button
            key={o}
            type="button"
            className={chip}
            onClick={() => {
              const r = answerListen(state, ctx, o);
              setState(r.state);
              vibrate(r.correct ? 25 : [40, 60, 40]);
            }}
          >
            {o}
          </button>
        ))}
        <button
          type="button"
          onClick={() => speakLines(story.lines.map((l) => ({ text: l.en, speaker: l.speaker, gender: story.speakers[l.speaker].gender })))}
          className="flex items-center justify-center gap-1.5 py-1 text-sm font-bold text-listen"
        >
          <Headphones className="size-4" aria-hidden /> {es ? "Escuchar la historia otra vez" : "Listen again"}
        </button>
      </div>
    );
  }

  if (step.kind === "review") return <ReviewInput ctx={ctx} card={step.card} setState={setState} />;
  if (step.kind === "repeat") return <RepeatInput ctx={ctx} en={step.en} state={state} setState={setState} />;
  if (step.kind === "produce") return <ProduceInput ctx={ctx} task={step.task} topicKey={topicKey} setState={setState} />;
  return null;
}

function ExerciseInput({ ex, onAnswer }: { ex: ClosedExercise; onAnswer: (given: string) => void }) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  if (ex.type === "multiple_choice") {
    return (
      <div className="flex flex-col gap-2">
        {ex.options.map((o) => (
          <button key={o} type="button" className={chip} onClick={() => onAnswer(o)}>
            {o}
          </button>
        ))}
      </div>
    );
  }
  if (ex.type === "word_order") {
    const sentence = picked.map((i) => ex.words[i]).join(" ");
    return (
      <div className="space-y-2.5">
        <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-2xl bg-[#f4f5fb] px-2 py-1.5">
          {picked.length === 0 && <span className="px-2 text-sm text-muted">Toca las palabras en orden</span>}
          {picked.map((i, pos) => (
            <button key={pos} type="button" onClick={() => setPicked(picked.filter((_, k) => k !== pos))} className="rounded-xl bg-brand px-3 py-1.5 font-bold text-white">
              {ex.words[i]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ex.words.map((w, i) => (
            <button
              key={i}
              type="button"
              disabled={picked.includes(i)}
              onClick={() => setPicked([...picked, i])}
              className="rounded-xl border-2 border-line bg-white px-3 py-1.5 font-bold disabled:opacity-25"
            >
              {w}
            </button>
          ))}
        </div>
        <button type="button" disabled={picked.length === 0} onClick={() => onAnswer(sentence)} className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-ink font-extrabold text-white disabled:opacity-40">
          <Send className="size-4" aria-hidden /> Enviar
        </button>
      </div>
    );
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onAnswer(text.trim());
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Escribe la palabra que falta…"
        aria-label="Tu respuesta"
        className="min-h-[48px] flex-1 rounded-full bg-[#f4f5fb] px-4 text-[16px] outline-none focus:ring-2 focus:ring-brand"
      />
      <button type="submit" disabled={!text.trim()} aria-label="Enviar" className="flex size-12 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40">
        <Send className="size-5" aria-hidden />
      </button>
    </form>
  );
}

function ReviewInput({ ctx, card, setState }: {
  ctx: Ctx;
  card: { id: number; front: string; back: string; kind: string };
  setState: React.Dispatch<React.SetStateAction<ChatState>>;
}) {
  const es = ctx.lang === "es";
  const [revealed, setRevealed] = useState(false);
  function rate(remembered: boolean) {
    void fetch("/api/review/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.id, rating: remembered ? "good" : "again" }),
    }).catch(() => undefined);
    setState((s) => answerReview(s, ctx, remembered));
  }
  if (!revealed)
    return (
      <div className="flex justify-end">
        <button
          type="button"
          className={chip}
          onClick={() => {
            setRevealed(true);
            speak(card.front, true);
          }}
        >
          {es ? "Piénsalo… y toca para ver 👀" : "Think… then tap to see 👀"}
        </button>
      </div>
    );
  return (
    <div className="space-y-2">
      <p className="rounded-2xl bg-[#f4f5fb] px-4 py-2.5 text-center font-bold">
        {card.front} {card.kind !== "error" && <span className="font-semibold text-muted">= {card.back}</span>}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => rate(false)} className="min-h-[46px] rounded-2xl bg-[#fde2e2] font-extrabold text-[#7f1d1d]">
          {es ? "No me acordé" : "I forgot"}
        </button>
        <button type="button" onClick={() => rate(true)} className="min-h-[46px] rounded-2xl bg-[#dcfce7] font-extrabold text-[#14532d]">
          {es ? "¡Me acordé!" : "Got it!"}
        </button>
      </div>
    </div>
  );
}

function RepeatInput({ ctx, en, state, setState }: {
  ctx: Ctx;
  en: string;
  state: ChatState;
  setState: React.Dispatch<React.SetStateAction<ChatState>>;
}) {
  const es = ctx.lang === "es";
  const mic = useSpeechInput();
  const [fails, setFails] = useState(0);
  async function record() {
    if (mic.state === "listening") return mic.stop();
    const heard = await mic.listen();
    if (!heard) return;
    const r = answerRepeat(state, ctx, heard);
    setState(r.state);
    vibrate(r.pass ? 25 : [40, 60, 40]);
    if (!r.pass) setFails((f) => f + 1);
  }
  const skip = es ? "Saltar ⏭️" : "Skip ⏭️";
  return (
    <div className="space-y-2">
      {mic.state === "listening" && mic.interim && <p className="text-center text-sm italic text-muted">“{mic.interim}”</p>}
      {mic.error && <p className="rounded-xl bg-[#fff4d6] px-3 py-2 text-sm text-[#5c3d00]">{mic.error}</p>}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => speak(en, true)} className="flex items-center gap-1.5 rounded-full bg-[#e6f1f8] px-3.5 py-2 text-sm font-extrabold text-listen">
          🐢 {es ? "Oír lento" : "Slow"}
        </button>
        {mic.mode !== "none" ? (
          <div className="scale-[0.8]">
            <MicButton state={mic.state} mode={mic.mode} onPress={record} />
          </div>
        ) : (
          <span className="text-xs text-muted">{es ? "Sin micrófono en este navegador" : "No microphone"}</span>
        )}
        <button
          type="button"
          onClick={() => {
            mic.stop();
            setState((s) => skipStep(s, skip));
          }}
          className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-bold ${fails >= 2 || mic.mode === "none" ? "bg-ink text-white" : "bg-[#f4f5fb] text-muted"}`}
        >
          <SkipForward className="size-4" aria-hidden /> {es ? "Saltar" : "Skip"}
        </button>
      </div>
    </div>
  );
}

function ProduceInput({ ctx, task, topicKey, setState }: {
  ctx: Ctx;
  task: string;
  topicKey: string;
  setState: React.Dispatch<React.SetStateAction<ChatState>>;
}) {
  const es = ctx.lang === "es";
  const mic = useSpeechInput();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);

  async function dictate() {
    if (mic.state === "listening") return mic.stop();
    const heard = await mic.listen();
    if (heard) setText((t) => `${t} ${heard}`.trim());
  }

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic_key: topicKey, task, text }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: body.error ?? "No se pudo corregir.", code: body.code ?? "unknown" });
        return;
      }
      setState((s) => answerProduce(s, text, body.evaluation as Evaluation));
    } catch {
      setError({ message: "Sin conexión. Intenta de nuevo.", code: "network" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-xl bg-[#fde2e2] px-3 py-2 text-sm text-[#7f1d1d]">
          {error.message}{" "}
          {["no_key", "key_rejected", "provider_limit"].includes(error.code) && (
            <Link href="/settings" className="font-bold underline">
              Ir a Ajustes
            </Link>
          )}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={2000}
          disabled={busy}
          spellCheck={false}
          autoCorrect="off"
          placeholder={es ? "Escribe en inglés o dicta con el micrófono…" : "Type in English or dictate…"}
          aria-label="Tu respuesta"
          className="min-h-[52px] flex-1 resize-none rounded-[22px] bg-[#f4f5fb] px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-brand"
        />
        {text.trim().split(/\s+/).filter(Boolean).length >= 3 ? (
          <button type="button" onClick={send} disabled={busy} aria-label="Enviar" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40">
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />}
          </button>
        ) : (
          mic.mode !== "none" && (
            <button
              type="button"
              onClick={dictate}
              aria-label="Dictar"
              className={`flex size-12 shrink-0 items-center justify-center rounded-full text-white ${mic.state === "listening" ? "animate-pulse bg-speak" : "bg-speak"}`}
            >
              {mic.state === "processing" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Mic className="size-5" aria-hidden />}
            </button>
          )
        )}
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{busy ? (es ? "Mike está corrigiendo…" : "Mike is correcting…") : es ? "Mínimo una frase completa · 1 solicitud" : "At least one full sentence"}</span>
        <button type="button" onClick={() => setState((s) => skipStep(s, es ? "Saltar ⏭️" : "Skip ⏭️"))} className="font-bold underline-offset-2 hover:underline">
          {es ? "Saltar" : "Skip"}
        </button>
      </div>
      {mic.error && <p className="text-xs text-[#b45309]">{mic.error}</p>}
    </div>
  );
}

