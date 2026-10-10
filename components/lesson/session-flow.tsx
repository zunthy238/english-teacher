// components/lesson/session-flow.tsx
// Sesión guiada: una tarjeta a la vez, a pantalla completa (Fase A, parte 2).
// Técnicas: poco texto por tarjeta, tocar para descubrir (recuperación), audio en cada frase,
// respuesta inmediata en cada ejercicio y cierre con resultado.
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, RotateCcw, Sparkles, Volume2, X } from "lucide-react";
import type { ClosedExercise, Lesson } from "@/lib/schemas/lesson";
import { gradeExercise, gradeLesson, type GradeResult, type LessonGrade } from "@/lib/grade";
import { blockOf, buildSession, correctSentence, type Block, type SessionStep } from "@/lib/session-plan";
import { speak, vibrate } from "./speech";
import { WritingExercise } from "./writing-exercise";
import { ReportExercise } from "./report-exercise";

export type SessionMeta = {
  topic_key: string;
  title: string;
  position: number;
  total: number;
  variant: number;
  source: "cache" | "ai";
};

export type SaveStatus =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; completed: boolean }
  | { status: "error" };

const THEME: Record<Block, { card: string; label: string; tag: string; bar: string }> = {
  learn: { card: "bg-learn text-[#2b1d00]", label: "Aprende", tag: "text-[#8a5a00]", bar: "bg-learn" },
  listen: { card: "bg-listen text-white", label: "Escucha", tag: "text-listen", bar: "bg-listen" },
  vocab: { card: "bg-review text-white", label: "Vocabulario", tag: "text-review", bar: "bg-review" },
  practice: { card: "bg-white text-ink", label: "Practica", tag: "text-practice", bar: "bg-practice" },
  write: { card: "bg-white text-ink", label: "Escribe", tag: "text-write", bar: "bg-write" },
};

const btnBase =
  "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40";
const primaryBtn = `${btnBase} bg-ink text-white`;
const brandBtn = `${btnBase} bg-brand-soft text-ink`;

function speechFor(step: SessionStep | undefined): { text: string; slow: boolean } | null {
  if (!step) return null;
  if (step.kind === "example") return { text: step.example.en, slow: true };
  if (step.kind === "vocab") return { text: step.item.word, slow: true };
  return null;
}

/* ---------- entradas de ejercicios, grandes para el celular ---------- */

function Options({ ex, value, onChange, locked, result }: {
  ex: Extract<ClosedExercise, { type: "multiple_choice" }>;
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
  result: GradeResult | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {ex.options.map((opt) => {
        const selected = value === opt;
        const isAnswer = opt === ex.answer;
        let style = "border-line bg-white text-ink";
        if (result) {
          if (isAnswer) style = "border-[#16a34a] bg-[#dcfce7] text-[#14532d]";
          else if (selected) style = "border-[#dc2626] bg-[#fde2e2] text-[#7f1d1d]";
        } else if (selected) style = "border-practice bg-practice text-white";
        return (
          <button
            key={opt}
            type="button"
            disabled={locked}
            aria-pressed={selected}
            onClick={() => onChange(opt)}
            className={`min-h-[56px] rounded-2xl border-2 px-5 text-left text-lg font-bold transition-colors ${style}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function WordChips({ ex, onChange, locked }: {
  ex: Extract<ClosedExercise, { type: "word_order" }>;
  onChange: (v: string) => void;
  locked: boolean;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const update = (next: number[]) => {
    setPicked(next);
    onChange(next.map((i) => ex.words[i]).join(" "));
  };
  return (
    <div className="space-y-5">
      <div className="flex min-h-[64px] flex-wrap content-start gap-2 border-b-2 border-line pb-3">
        {picked.length === 0 && <span className="self-center text-muted">Toca las palabras en orden</span>}
        {picked.map((i, pos) => (
          <button
            key={i}
            type="button"
            disabled={locked}
            onClick={() => update(picked.filter((_, p) => p !== pos))}
            className="min-h-[48px] rounded-xl border-2 border-practice bg-[#e9e8ff] px-4 text-lg font-bold text-ink"
          >
            {ex.words[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {ex.words.map((w, i) => (
          <button
            key={i}
            type="button"
            disabled={locked || picked.includes(i)}
            onClick={() => update([...picked, i])}
            className="min-h-[48px] rounded-xl border-2 border-line bg-white px-4 text-lg font-bold text-ink transition-opacity disabled:opacity-25"
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- la sesión ---------- */

export function SessionFlow({
  lesson,
  meta,
  attempt,
  save,
  onPracticeDone,
  onRestart,
  onNextTopic,
  onNewVersion,
}: {
  lesson: Lesson;
  meta: SessionMeta;
  attempt: number;
  save: SaveStatus;
  onPracticeDone: (grade: LessonGrade) => void;
  onRestart: () => void;
  onNextTopic: () => void;
  onNewVersion: () => void;
}) {
  const steps = useMemo(() => buildSession(lesson), [lesson]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, GradeResult>>({});
  const [grade, setGrade] = useState<LessonGrade | null>(null);

  const step = steps[i];
  const block = blockOf(step);
  const theme = block ? THEME[block] : null;
  const progress = Math.round((i / (steps.length - 1)) * 100);
  const counts = {
    learn: steps.filter((s) => s.kind === "learn").length,
    examples: steps.filter((s) => s.kind === "example").length,
    vocab: steps.filter((s) => s.kind === "vocab").length,
    exercises: steps.filter((s) => s.kind === "exercise").length,
  };

  function goNext() {
    const n = Math.min(i + 1, steps.length - 1);
    // Al salir del último ejercicio se califica la práctica y se guarda el progreso
    if (step.kind === "exercise" && steps[n].kind !== "exercise" && !grade) {
      const g = gradeLesson(lesson.exercises, answers);
      setGrade(g);
      onPracticeDone(g);
    }
    setI(n);
    setRevealed(false);
    const audio = speechFor(steps[n]);
    if (audio) speak(audio.text, audio.slow); // dentro del toque: funciona en iPhone
    window.scrollTo({ top: 0 });
  }

  function check(ex: ClosedExercise) {
    const result = gradeExercise(ex, answers[ex.id] ?? "");
    setChecked((c) => ({ ...c, [ex.id]: result }));
    vibrate(result.correct ? 25 : [40, 60, 40]);
    speak(correctSentence(ex));
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-canvas text-ink">
      <div className="mx-auto flex h-full w-full max-w-xl flex-col">
        {/* Encabezado: salir, avance, contador */}
        <div className="flex items-center gap-3 px-5 pb-2 pt-[max(16px,env(safe-area-inset-top))]">
          <Link
            href="/today"
            aria-label="Salir de la sesión"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ink"
          >
            <X className="size-5" aria-hidden strokeWidth={2.6} />
          </Link>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la sesión">
            <div className={`h-full rounded-full transition-all duration-500 ${theme?.bar ?? "bg-brand"}`} style={{ width: `${progress}%` }} />
          </div>
          <span className="w-12 text-right text-sm font-bold text-muted">
            {i}/{steps.length - 1}
          </span>
        </div>

        <div key={i} className="flex flex-1 flex-col overflow-y-auto px-5 pb-4 pt-3 pm-rise">
          {/* INTRO */}
          {step.kind === "intro" && (
            <div className="flex flex-1 flex-col gap-6">
              <div className="flex flex-1 flex-col justify-center gap-4">
                <span className="w-fit rounded-full bg-brand/15 px-3 py-1 text-sm font-extrabold text-brand">
                  {lesson.cefr_level} · Tema {meta.position} de {meta.total}
                </span>
                <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">{lesson.title}</h1>
                <p className="text-lg text-muted">Una tarjeta a la vez. Escucha, descubre y practica.</p>
                <ul className="mt-2 grid grid-cols-2 gap-2.5">
                  <li className="rounded-2xl bg-learn px-4 py-3 font-bold text-[#2b1d00]">{counts.learn} ideas clave</li>
                  <li className="rounded-2xl bg-listen px-4 py-3 font-bold text-white">{counts.examples} frases para escuchar</li>
                  <li className="rounded-2xl bg-review px-4 py-3 font-bold text-white">{counts.vocab} palabras nuevas</li>
                  <li className="rounded-2xl bg-practice px-4 py-3 font-bold text-white">{counts.exercises} ejercicios</li>
                </ul>
              </div>
              <button type="button" className={primaryBtn} onClick={goNext}>
                Empezar <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
              </button>
            </div>
          )}

          {/* APRENDE: poco texto por tarjeta */}
          {step.kind === "learn" && theme && (
            <div className="flex flex-1 flex-col gap-5">
              <p className={`text-sm font-extrabold uppercase tracking-widest ${theme.tag}`}>
                {theme.label} · {step.index} de {step.total}
              </p>
              <div className={`flex flex-1 flex-col justify-center rounded-[28px] p-7 ${theme.card}`}>
                <p className="whitespace-pre-line text-[21px] font-semibold leading-relaxed">{step.text}</p>
              </div>
              <button type="button" className={primaryBtn} onClick={goNext}>
                Entendido <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
              </button>
            </div>
          )}

          {/* ESCUCHA: oye la frase, adivina qué significa, luego descubre */}
          {step.kind === "example" && theme && (
            <div className="flex flex-1 flex-col gap-5">
              <p className={`text-sm font-extrabold uppercase tracking-widest ${theme.tag}`}>
                {theme.label} · {step.index} de {step.total}
              </p>
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className={`flex flex-1 flex-col items-center justify-center gap-6 rounded-[28px] p-7 text-center ${theme.card}`}
              >
                <span className="font-display text-[32px] font-extrabold leading-tight">{step.example.en}</span>
                {revealed && step.example.es ? (
                  <span className="rounded-2xl bg-white/20 px-5 py-3 text-lg font-semibold pm-pop">{step.example.es}</span>
                ) : (
                  <span className="text-base text-white/85">¿Qué significa? Piénsalo y toca para ver</span>
                )}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => speak(step.example.en, true)}
                  className="flex min-h-[56px] items-center gap-2 rounded-2xl bg-white px-5 font-extrabold text-listen"
                >
                  <Volume2 className="size-5" aria-hidden /> Escuchar
                </button>
                <button type="button" className={primaryBtn} onClick={goNext}>
                  Siguiente <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
                </button>
              </div>
            </div>
          )}

          {/* VOCABULARIO: tarjeta que se voltea */}
          {step.kind === "vocab" && theme && (
            <div className="flex flex-1 flex-col gap-5">
              <p className={`text-sm font-extrabold uppercase tracking-widest ${theme.tag}`}>
                {theme.label} · {step.index} de {step.total}
              </p>
              <button
                type="button"
                onClick={() => {
                  setRevealed(true);
                  if (!revealed) speak(step.item.example);
                }}
                className={`flex flex-1 flex-col items-center justify-center gap-5 rounded-[28px] p-7 text-center ${theme.card}`}
              >
                <span className="font-display text-[40px] font-extrabold leading-none">{step.item.word}</span>
                {revealed ? (
                  <span className="flex flex-col gap-3 pm-pop">
                    <span className="text-2xl font-bold">{step.item.meaning_es}</span>
                    <span className="rounded-2xl bg-white/20 px-5 py-3 text-lg italic">{step.item.example}</span>
                  </span>
                ) : (
                  <span className="text-base text-white/85">¿La recuerdas? Toca para voltear</span>
                )}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => speak(step.item.word, true)}
                  className="flex min-h-[56px] items-center gap-2 rounded-2xl bg-white px-5 font-extrabold text-review"
                >
                  <Volume2 className="size-5" aria-hidden /> Escuchar
                </button>
                <button type="button" className={primaryBtn} onClick={goNext}>
                  Siguiente <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
                </button>
              </div>
            </div>
          )}

          {/* PRACTICA: un ejercicio a la vez, con respuesta inmediata */}
          {step.kind === "exercise" && theme && (() => {
            const ex = step.exercise;
            const value = answers[ex.id] ?? "";
            const result = checked[ex.id] ?? null;
            const setValue = (v: string) => setAnswers((a) => ({ ...a, [ex.id]: v }));
            const label =
              ex.type === "multiple_choice" ? "Elige la opción correcta" : ex.type === "fill_blank" ? "Completa la frase" : ex.prompt;
            return (
              <div className="flex flex-1 flex-col gap-5">
                <div>
                  <p className={`text-sm font-extrabold uppercase tracking-widest ${theme.tag}`}>
                    {theme.label} · {step.index} de {step.total}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-extrabold">{label}</h2>
                </div>
                {ex.type !== "word_order" && (
                  <div className="rounded-[28px] bg-white px-6 py-7 text-center">
                    <p className="font-display text-[26px] font-bold leading-snug">{ex.prompt}</p>
                  </div>
                )}
                {ex.type === "multiple_choice" && (
                  <Options ex={ex} value={value} onChange={setValue} locked={!!result} result={result} />
                )}
                {ex.type === "fill_blank" && (
                  <div className="space-y-2">
                    <label htmlFor={`fill-${ex.id}`} className="text-sm font-bold text-muted">
                      Tu respuesta
                    </label>
                    <input
                      id={`fill-${ex.id}`}
                      type="text"
                      value={value}
                      disabled={!!result}
                      onChange={(e) => setValue(e.target.value)}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="min-h-[56px] w-full rounded-2xl border-2 border-line bg-white px-5 text-xl font-bold outline-none focus:border-practice"
                    />
                  </div>
                )}
                {ex.type === "word_order" && <WordChips ex={ex} onChange={setValue} locked={!!result} />}

                <div className="flex-1" />

                {!result ? (
                  <button type="button" className={primaryBtn} disabled={!value.trim()} onClick={() => check(ex)}>
                    Comprobar
                  </button>
                ) : (
                  <div
                    className={`space-y-3 rounded-[24px] p-5 pm-pop ${
                      result.correct ? "bg-[#dcfce7] text-[#14532d]" : "bg-[#fde2e2] text-[#7f1d1d]"
                    }`}
                    role="status"
                  >
                    <p className="flex items-center gap-2 text-xl font-extrabold">
                      {result.correct ? <Check className="size-6" aria-hidden strokeWidth={3} /> : <X className="size-6" aria-hidden strokeWidth={3} />}
                      {result.correct ? "¡Correcto!" : "Casi"}
                    </p>
                    <button
                      type="button"
                      onClick={() => speak(correctSentence(ex))}
                      className="flex w-full items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-left text-lg font-bold"
                    >
                      <Volume2 className="size-5 shrink-0" aria-hidden />
                      {correctSentence(ex)}
                    </button>
                    <button type="button" className={primaryBtn} onClick={goNext}>
                      Continuar <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
                    </button>
                    <ReportExercise exercise={ex} userAnswer={value} topicKey={meta.topic_key} variant={meta.variant} />
                  </div>
                )}
              </div>
            );
          })()}

          {/* ESCRIBE */}
          {step.kind === "write" && theme && (
            <div className="flex flex-1 flex-col gap-5">
              <p className={`text-sm font-extrabold uppercase tracking-widest ${theme.tag}`}>{theme.label} · último paso</p>
              <WritingExercise topicKey={meta.topic_key} task={step.task} />
              <div className="flex-1" />
              <button type="button" className={primaryBtn} onClick={goNext}>
                Terminar sesión <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
              </button>
            </div>
          )}

          {/* CIERRE */}
          {step.kind === "done" && (() => {
            const completed = save.status === "saved" && save.completed;
            const score = grade?.score ?? 0;
            return (
              <div className="-mx-5 -mb-4 -mt-3 flex flex-1 flex-col gap-5 bg-ink px-6 pb-6 pt-10 text-white">
                <div className="flex flex-col items-center gap-3 text-center pm-pop">
                  <span className={`flex size-24 items-center justify-center rounded-full ${completed ? "bg-[#4ade80]" : "bg-brand-soft"}`}>
                    {completed ? (
                      <Check className="size-12 text-ink" aria-hidden strokeWidth={3} />
                    ) : (
                      <Sparkles className="size-11 text-ink" aria-hidden strokeWidth={2.4} />
                    )}
                  </span>
                  <h2 className="font-display text-4xl font-extrabold">{completed ? "¡Tema completado!" : "¡Sesión terminada!"}</h2>
                  <p className="text-[#b9bce6]">
                    {completed ? "Avanzas al siguiente tema." : "Necesitas 80 o más en la práctica para avanzar. ¡Tú puedes!"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-ink-soft p-4 text-center">
                    <p className="font-display text-3xl font-extrabold">{score}</p>
                    <p className="text-xs text-[#b9bce6]">puntaje de práctica</p>
                  </div>
                  <div className="rounded-2xl bg-ink-soft p-4 text-center">
                    <p className="font-display text-3xl font-extrabold">
                      {grade?.correct ?? 0}/{grade?.total ?? 0}
                    </p>
                    <p className="text-xs text-[#b9bce6]">respuestas correctas</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#ddf5ef] px-5 py-4 text-[#0b5148]">
                  <p className="text-xs font-extrabold uppercase tracking-widest">{completed ? "Nuevo · Ya puedo" : "Hoy practicaste"}</p>
                  <p className="mt-1 text-lg font-bold">{lesson.title}</p>
                </div>
                {save.status === "saving" && <p className="text-center text-sm text-[#b9bce6]">Guardando tu progreso…</p>}
                {save.status === "error" && (
                  <p role="alert" className="rounded-xl bg-[#fde2e2] px-4 py-3 text-sm text-[#7f1d1d]">
                    No se pudo guardar tu progreso. Revisa tu conexión.
                  </p>
                )}
                <div className="flex-1" />
                {completed && meta.position < meta.total ? (
                  <button type="button" onClick={onNextTopic} className={brandBtn}>
                    Siguiente tema <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
                  </button>
                ) : (
                  <button type="button" onClick={onRestart} className={brandBtn}>
                    <RotateCcw className="size-5" aria-hidden strokeWidth={2.6} /> Repetir la sesión
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/today" className="flex min-h-[52px] items-center justify-center rounded-2xl bg-ink-soft font-bold">
                    Volver a Hoy
                  </Link>
                  <button type="button" onClick={onNewVersion} className="min-h-[52px] rounded-2xl bg-ink-soft font-bold">
                    Otra versión
                  </button>
                </div>
                {attempt > 0 && <p className="text-center text-xs text-[#b9bce6]">Intento {attempt + 1}: tus errores ya se contaron en el primero.</p>}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
