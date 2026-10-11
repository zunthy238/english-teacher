import { describe, expect, it } from "vitest";
import { buildChatScript, isInteractive, masteryScore, mikeLang } from "./script";
import { answerExercise, answerListen, answerPause, answerRepeat, answerReview, pending, runAuto, skipStep, type Ctx } from "./engine";
import { newChatState, parseChatStatePut, type ChatState } from "./state";
import { MOCK_LESSONS } from "../mock/lessons";
import { validateStory } from "../story-validate";
import { RAW_STORY } from "../mock/story";
import { isClosedExercise } from "../schemas/lesson";
import type { Story } from "../schemas/story";

const lesson = MOCK_LESSONS[1];
const story = (validateStory(RAW_STORY, { topic_key: "A1_first_day", cefr_level: "A1" }) as { ok: true; value: Story }).value;
const review = [{ id: 7, kind: "vocab" as const, front: "badge", back: "carné", extra: null }];

function makeCtx(withStory = true): Ctx {
  return { steps: buildChatScript({ lesson, story: withStory ? story : null, level: "A1", review }), lang: "es", story: withStory ? story : null };
}

// Simula a un estudiante: answerFor decide qué responde a cada ejercicio
function run(ctx: Ctx, answerFor: (ex: ReturnType<typeof getEx>, isRetry: boolean) => string, maxTurns = 400) {
  let s: ChatState = newChatState(review);
  for (let i = 0; i < maxTurns; i++) {
    const p = pending(s, ctx);
    if (p.type === "auto") s = runAuto(s, ctx);
    else if (p.type === "finish" || p.type === "idle") return s;
    else {
      const step = p.step;
      if (step.kind === "pause") s = answerPause(s, "ok");
      else if (step.kind === "review") s = answerReview(s, ctx, true);
      else if (step.kind === "repeat") s = answerRepeat(s, ctx, step.en).state;
      else if (step.kind === "listen") s = answerListen(s, ctx, ctx.story!.questions[step.q].answer).state;
      else if (step.kind === "produce") s = skipStep(s, "skip");
      else if (step.kind === "exercise") s = answerExercise(s, ctx, answerFor(step.exercise, false)).state;
      else if (step.kind === "retry") s = answerExercise(s, ctx, answerFor(p.retryExercise!, true)).state;
    }
  }
  throw new Error("la conversación no terminó");
}
const getEx = () => lesson.exercises.filter(isClosedExercise)[0];

describe("guion de Mike Chat", () => {
  const ctx = makeCtx();
  it("empieza saludando, repasa, enseña, practica, escucha y termina", () => {
    const kinds = ctx.steps.map((s) => s.kind);
    expect(kinds[0]).toBe("say");
    expect(kinds).toContain("review");
    expect(kinds.indexOf("repeat")).toBeLessThan(kinds.indexOf("exercise"));
    expect(kinds).toContain("story");
    expect(kinds.filter((k) => k === "listen")).toHaveLength(3);
    expect(kinds.at(-1)).toBe("done");
    expect(kinds.indexOf("retry")).toBeLessThan(kinds.indexOf("done"));
  });
  it("incluye TODOS los ejercicios de la lección", () => {
    expect(ctx.steps.filter((s) => s.kind === "exercise")).toHaveLength(lesson.exercises.filter(isClosedExercise).length);
  });
  it("sin historia sigue funcionando", () => {
    expect(makeCtx(false).steps.some((s) => s.kind === "story" || s.kind === "listen")).toBe(false);
  });
  it("Mike habla español hasta B1 e inglés desde B2", () => {
    expect(mikeLang("A1")).toBe("es");
    expect(mikeLang("C1")).toBe("en");
  });
  it("las pausas, ejercicios y preguntas esperan al estudiante", () => {
    expect(isInteractive({ id: "x", kind: "exercise", exercise: getEx() })).toBe(true);
    expect(isInteractive({ id: "x", kind: "say", text: "hola" })).toBe(false);
  });
});

describe("motor: dominio antes de avanzar", () => {
  it("todo bien al primer intento → 100 % y sin repaso de fallados", () => {
    const s = run(makeCtx(), (ex) => ex.answer);
    expect(masteryScore(s.first, s.recovered)).toBe(100);
    expect(s.retryAnnounced).toBe(false);
  });
  it("lo fallado vuelve al final sin pistas y, si lo aciertas, cuenta a medias", () => {
    const failOnce = new Set<string>();
    const s = run(makeCtx(), (ex, isRetry) => {
      if (!isRetry && !failOnce.has(ex.id) && failOnce.size < 2) {
        failOnce.add(ex.id);
        return "respuesta mala";
      }
      return ex.answer;
    });
    expect(s.retryAnnounced).toBe(true);
    expect(s.recovered.sort()).toEqual([...failOnce].sort());
    const total = Object.keys(s.first).length;
    expect(masteryScore(s.first, s.recovered)).toBe(Math.round(((total - 2 + 1) / total) * 100));
    expect(s.firstGiven[[...failOnce][0]]).toBe("respuesta mala");
  });
  it("si falla siempre, la conversación igual termina (nunca se queda atascada)", () => {
    const s = run(makeCtx(), () => "mal");
    expect(masteryScore(s.first, s.recovered)).toBe(0);
  });
  it("repetir: con menos de 80 % se queda en la misma frase", () => {
    const ctx = makeCtx();
    let s = newChatState(review);
    while (pending(s, ctx).type !== "wait" || (pending(s, ctx) as { step: { kind: string } }).step.kind !== "repeat") {
      const p = pending(s, ctx);
      if (p.type === "auto") s = runAuto(s, ctx);
      else if (p.type === "wait" && p.step.kind === "pause") s = answerPause(s, "ok");
      else if (p.type === "wait" && p.step.kind === "review") s = answerReview(s, ctx, false);
    }
    const pos = s.pos;
    const r = answerRepeat(s, ctx, "hmm");
    expect(r.pass).toBe(false);
    expect(r.state.pos).toBe(pos);
  });
});

describe("estado guardado", () => {
  it("valida lo que llega a /api/chat-state", () => {
    expect(parseChatStatePut({ topic_key: "A1_intro", variant: 1, state: newChatState([]) }).ok).toBe(true);
    expect(parseChatStatePut({ topic_key: "x", variant: 1, state: newChatState([]) }).ok).toBe(false);
    expect(parseChatStatePut({ topic_key: "A1_intro", variant: 0, state: newChatState([]) }).ok).toBe(false);
    expect(parseChatStatePut({ topic_key: "A1_intro", variant: 1, state: { v: 2 } }).ok).toBe(false);
  });
});
