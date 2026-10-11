// lib/chat/engine.ts
// El "profesor" de Mike Chat: decide qué dice Mike, califica y aplica la regla de dominio (funciones puras, probadas).
// Regla: lo que fallas vuelve al final de la lección sin pistas; el tema se completa con dominio ≥ 80.
import { gradeExercise } from "../grade";
import { correctSentence } from "../session-plan";
import { scoreShadow } from "../speak/shadow";
import type { ClosedExercise } from "../schemas/lesson";
import type { Story } from "../schemas/story";
import type { Evaluation } from "../evaluate-validate";
import type { ChatStep } from "./script";
import type { ChatEntry, ChatState } from "./state";

export type Ctx = { steps: ChatStep[]; lang: "es" | "en"; story: Story | null };
export type Pending = { type: "auto"; delay: number } | { type: "wait"; step: ChatStep; retryExercise?: ClosedExercise } | { type: "finish" } | { type: "idle" };

const M = {
  es: {
    ok: ["✅ ¡Correcto!", "✅ ¡Muy bien!", "✅ ¡Exacto!", "✅ ¡Perfecto!"],
    wrong: (a: string) => `❌ Casi. La respuesta es: *${a}*. Lo repasamos al final 😉`,
    wrongRetry: (a: string) => `❌ Era: *${a}*. Fíjate bien y seguimos.`,
    listenNo: (a: string) => `❌ La respuesta es: *${a}*. Escucha esa parte:`,
    remembered: "¡Me acordé! ✅",
    forgot: "No me acordé 😅",
    repeatOk: (p: number) => `✅ ¡Muy bien! Se te entiende: ${p}%`,
    repeatNo: (p: number, tip: string | null) => `Casi (${p}%). ${tip ?? ""} Inténtalo otra vez 🎙️`,
    reviewQ: (front: string) => `¿Qué significa *${front}*?`,
    reviewErr: (extra: string) => `${extra}. ¿Cómo se dice bien?`,
  },
  en: {
    ok: ["✅ Correct!", "✅ Nice!", "✅ Exactly!", "✅ Perfect!"],
    wrong: (a: string) => `❌ Close. The answer is: *${a}*. We'll come back to it at the end 😉`,
    wrongRetry: (a: string) => `❌ It was: *${a}*. Look closely and let's keep going.`,
    listenNo: (a: string) => `❌ The answer is: *${a}*. Listen to that part:`,
    remembered: "I remembered! ✅",
    forgot: "I forgot 😅",
    repeatOk: (p: number) => `✅ Great! You're easy to understand: ${p}%`,
    repeatNo: (p: number, tip: string | null) => `Almost (${p}%). ${tip ?? ""} Try again 🎙️`,
    reviewQ: (front: string) => `What does *${front}* mean?`,
    reviewErr: (extra: string) => `${extra}. What's the correct way to say it?`,
  },
};
export const msg = M;

const NEEDS_PROMPT = new Set(["exercise", "listen", "repeat", "review", "produce"]);

function exerciseById(steps: ChatStep[], id: string): ClosedExercise | undefined {
  for (const s of steps) if (s.kind === "exercise" && s.exercise.id === id) return s.exercise;
  return undefined;
}

export function pending(state: ChatState, ctx: Ctx): Pending {
  if (state.finished) return { type: "idle" };
  const step = ctx.steps[state.pos];
  if (!step) return { type: "idle" };
  if (step.kind === "done") return { type: "finish" };
  if (step.kind === "say" || step.kind === "vocab" || step.kind === "story") {
    const delay = step.kind === "say" ? Math.min(1500, 450 + step.text.length * 10) : 700;
    return { type: "auto", delay };
  }
  if (step.kind === "retry") {
    if (state.retry.length === 0 || !state.retryAnnounced || state.retryAsked === null) return { type: "auto", delay: 600 };
    return { type: "wait", step, retryExercise: exerciseById(ctx.steps, state.retryAsked) };
  }
  if (NEEDS_PROMPT.has(step.kind) && !state.asked.includes(step.id)) return { type: "auto", delay: 600 };
  return { type: "wait", step };
}

const push = (s: ChatState, ...entries: ChatEntry[]): ChatState => ({ ...s, log: [...s.log, ...entries] });

export function promptFor(step: ChatStep, ctx: Ctx): ChatEntry | null {
  const t = M[ctx.lang];
  switch (step.kind) {
    case "exercise":
      return { t: "mike", text: step.exercise.prompt };
    case "listen": {
      const q = ctx.story?.questions[step.q];
      return q ? { t: "mike", text: `🎧 ${q.question}` } : null;
    }
    case "repeat":
      return { t: "mike", text: "", en: step.en, es: step.es };
    case "review":
      return {
        t: "mike",
        text: step.card.kind === "error" && step.card.extra ? t.reviewErr(step.card.extra) : t.reviewQ(step.card.front),
      };
    case "produce":
      return { t: "mike", text: step.task };
    default:
      return null;
  }
}

// Ejecuta UNA acción automática de Mike (mensaje, pregunta, anuncio de repaso…)
export function runAuto(state: ChatState, ctx: Ctx): ChatState {
  const step = ctx.steps[state.pos];
  if (!step) return state;
  if (step.kind === "say") return { ...push(state, { t: "mike", text: step.text, en: step.en, es: step.es, rule: step.rule }), pos: state.pos + 1 };
  if (step.kind === "vocab") return { ...push(state, { t: "vocab", items: step.items }), pos: state.pos + 1 };
  if (step.kind === "story") return { ...(ctx.story ? push(state, { t: "story" }) : state), pos: state.pos + 1 };
  if (step.kind === "retry") {
    if (state.retry.length === 0) return { ...state, pos: state.pos + 1 };
    const t = ctx.lang === "es" ? "Repasemos las que fallaste. Esta vez sin pistas 💪" : "Let's go over the ones you missed. No hints this time 💪";
    if (!state.retryAnnounced) return { ...push(state, { t: "mike", text: t }), retryAnnounced: true };
    const ex = exerciseById(ctx.steps, state.retry[0]);
    if (!ex) return { ...state, retry: state.retry.slice(1) };
    return { ...push(state, { t: "mike", text: ex.prompt }), retryAsked: ex.id };
  }
  if (NEEDS_PROMPT.has(step.kind) && !state.asked.includes(step.id)) {
    const p = promptFor(step, ctx);
    const next = { ...state, asked: [...state.asked, step.id] };
    if (step.kind === "listen" && !p) return { ...next, pos: state.pos + 1 }; // sin historia: se salta
    return p ? push(next, p) : next;
  }
  return state;
}

export function answerPause(state: ChatState, label: string): ChatState {
  return { ...push(state, { t: "user", text: label }), pos: state.pos + 1 };
}

export function answerExercise(state: ChatState, ctx: Ctx, given: string): { state: ChatState; correct: boolean; sentence: string } {
  const t = M[ctx.lang];
  const step = ctx.steps[state.pos];
  const isRetry = step?.kind === "retry";
  const ex = isRetry ? exerciseById(ctx.steps, state.retryAsked ?? "") : step?.kind === "exercise" ? step.exercise : undefined;
  if (!ex) return { state, correct: false, sentence: "" };
  const { correct } = gradeExercise(ex, given);
  const sentence = correctSentence(ex);
  let s = push(state, { t: "user", text: given || "—" });
  const okText = t.ok[Object.keys(state.first).length % t.ok.length];

  if (!isRetry) {
    s = {
      ...s,
      first: ex.id in s.first ? s.first : { ...s.first, [ex.id]: correct },
      firstGiven: ex.id in s.firstGiven ? s.firstGiven : { ...s.firstGiven, [ex.id]: given },
      retry: correct || s.retry.includes(ex.id) ? s.retry : [...s.retry, ex.id],
      pos: s.pos + 1,
    };
    s = push(s, correct ? { t: "fb", ok: true, text: okText, en: sentence } : { t: "fb", ok: false, text: t.wrong(ex.answer), en: sentence });
    return { state: s, correct, sentence };
  }

  // Repaso de lo fallado
  const fails = (s.retryFails[ex.id] ?? 0) + (correct ? 0 : 1);
  const rest = s.retry.slice(1);
  s = {
    ...s,
    retry: correct || fails >= 2 ? rest : [...rest, ex.id],
    recovered: correct && !s.recovered.includes(ex.id) ? [...s.recovered, ex.id] : s.recovered,
    retryFails: { ...s.retryFails, [ex.id]: fails },
    retryAsked: null,
  };
  s = push(s, correct ? { t: "fb", ok: true, text: okText, en: sentence } : { t: "fb", ok: false, text: t.wrongRetry(ex.answer), en: sentence });
  return { state: s, correct, sentence };
}

export function answerListen(state: ChatState, ctx: Ctx, choice: string): { state: ChatState; correct: boolean } {
  const step = ctx.steps[state.pos];
  const q = step?.kind === "listen" ? ctx.story?.questions[step.q] : undefined;
  if (!q || !ctx.story) return { state: { ...state, pos: state.pos + 1 }, correct: false };
  const t = M[ctx.lang];
  const correct = choice === q.answer;
  const line = ctx.story.lines[q.line]?.en;
  let s = push(state, { t: "user", text: choice });
  s = push(s, correct ? { t: "fb", ok: true, text: t.ok[0], en: line } : { t: "fb", ok: false, text: t.listenNo(q.answer), en: line });
  return { state: { ...s, pos: s.pos + 1 }, correct };
}

export function answerReview(state: ChatState, ctx: Ctx, remembered: boolean): ChatState {
  const step = ctx.steps[state.pos];
  if (step?.kind !== "review") return state;
  const t = M[ctx.lang];
  const c = step.card;
  let s = push(state, { t: "user", text: remembered ? t.remembered : t.forgot });
  s = push(s, { t: "fb", ok: remembered, text: c.kind === "error" ? `✅ *${c.front}*` : `*${c.front}* = ${c.back}`, en: c.front });
  return { ...s, pos: s.pos + 1 };
}

export function answerRepeat(state: ChatState, ctx: Ctx, heard: string): { state: ChatState; pass: boolean } {
  const step = ctx.steps[state.pos];
  if (step?.kind !== "repeat") return { state, pass: false };
  const t = M[ctx.lang];
  const r = scoreShadow(step.en, heard);
  let s = push(state, { t: "user", text: heard, voice: true });
  s = push(s, { t: "fb", ok: r.pass, text: r.pass ? t.repeatOk(r.pct) : t.repeatNo(r.pct, r.tip), en: step.en, words: r.words });
  return { state: r.pass ? { ...s, pos: s.pos + 1 } : s, pass: r.pass };
}

export function skipStep(state: ChatState, label: string): ChatState {
  return { ...push(state, { t: "user", text: label }), pos: state.pos + 1 };
}

export function answerProduce(state: ChatState, text: string, evaluation: Evaluation): ChatState {
  let s = push(state, { t: "user", text });
  s = push(s, {
    t: "eval",
    score: evaluation.score,
    corrections: evaluation.corrections.slice(0, 4).map((c) => ({ wrong: c.wrong, right: c.right, explanation: c.explanation })),
    improved: evaluation.improved_version,
  });
  return { ...s, pos: s.pos + 1 };
}
