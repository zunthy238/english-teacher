import { describe, expect, it } from "vitest";
import { diffDictation, validateStory } from "./story-validate";
import { buildLibrary, listeningIsWeak } from "./listen-library";
import { buildSession, buildStorySteps, blockOf } from "./session-plan";
import { MOCK_LESSONS } from "./mock/lessons";
import type { Story } from "./schemas/story";

export const RAW_STORY = {
  title: "First Day at the Office",
  scene_emoji: "☕💻",
  setting_es: "David llega a su primer día de trabajo.",
  speakers: [
    { name: "Maria", gender: "female" },
    { name: "David", gender: "male" },
  ],
  key_words: [
    { word: "badge", meaning_es: "carné" },
    { word: "desk", meaning_es: "escritorio" },
    { word: "team lead", meaning_es: "líder del equipo" },
  ],
  lines: [
    { speaker: 0, en: "Hi! You must be David. Welcome to the team.", es: "¡Hola! Tú debes ser David. Bienvenido al equipo." },
    { speaker: 1, en: "Thanks! Sorry I'm late. My train was delayed.", es: "¡Gracias! Perdón por llegar tarde. Mi tren se retrasó." },
    { speaker: 0, en: "No worries. Here's your badge.", es: "Tranquilo. Aquí está tu carné." },
    { speaker: 1, en: "Great. Where's my desk?", es: "Genial. ¿Dónde está mi escritorio?" },
    { speaker: 0, en: "It's next to your team lead, Sam. He's really nice.", es: "Está al lado de tu líder, Sam. Es muy amable." },
    { speaker: 1, en: "Perfect. What time is the first meeting?", es: "Perfecto. ¿A qué hora es la primera reunión?" },
    { speaker: 0, en: "It's at ten. We meet every Monday.", es: "Es a las diez. Nos reunimos cada lunes." },
    { speaker: 1, en: "Okay. I'll get a coffee first.", es: "Vale. Primero tomaré un café." },
    { speaker: 0, en: "Good idea. The kitchen is on the left.", es: "Buena idea. La cocina está a la izquierda." },
  ],
  questions: [
    { question: "What is the conversation mainly about?", options: ["A first day at work", "A job interview", "A trip"], answer: "A first day at work", line: 0, explanation_es: "Maria le da la bienvenida." },
    { question: "Why is David late?", options: ["His train was delayed", "He forgot his badge", "He had a meeting"], answer: "His train was delayed", line: 1, explanation_es: "Dice: my train was delayed." },
    { question: "Where is David's desk?", options: ["Next to Sam", "In the kitchen", "On the left"], answer: "next to sam", line: 4, explanation_es: "Next to your team lead, Sam." },
    { question: "When is the meeting?", options: ["At ten", "At two", "At noon"], answer: "At ten", line: 6, explanation_es: "It's at ten." },
  ],
  dictation: [2, 99],
};

const ctx = { topic_key: "A1_first_day", cefr_level: "A1" as const };

describe("validateStory", () => {
  it("acepta una historia bien formada y la normaliza", () => {
    const r = validateStory(RAW_STORY, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.questions[2].answer).toBe("Next to Sam"); // corrige mayúsculas de la respuesta
    expect(r.value.dictation).toHaveLength(2); // descarta el índice 99 y completa con una línea corta
    expect(r.value.dictation).toContain(2);
  });
  it("rechaza historias sin las 4 preguntas válidas", () => {
    const bad = { ...RAW_STORY, questions: RAW_STORY.questions.slice(0, 2) };
    expect(validateStory(bad, ctx).ok).toBe(false);
  });
  it("rechaza preguntas cuya respuesta no está en las opciones", () => {
    const qs = RAW_STORY.questions.map((q, i) => (i === 1 ? { ...q, answer: "He overslept" } : q));
    expect(validateStory({ ...RAW_STORY, questions: qs }, ctx).ok).toBe(false);
  });
  it("rechaza una historia demasiado larga para el nivel", () => {
    const long = RAW_STORY.lines.map((l) => ({ ...l, en: `${l.en} ${"really ".repeat(20)}` }));
    expect(validateStory({ ...RAW_STORY, lines: long }, ctx).ok).toBe(false);
  });
  it("descarta palabras clave que no aparecen en el diálogo", () => {
    const kw = [...RAW_STORY.key_words.slice(0, 2), { word: "elevator", meaning_es: "ascensor" }];
    const r = validateStory({ ...RAW_STORY, key_words: kw }, ctx);
    expect(r.ok && r.value.key_words.map((k) => k.word)).toEqual(["badge", "desk"]);
  });
});

describe("dictado", () => {
  it("marca las palabras que faltaron y acepta contracciones", () => {
    const d = diffDictation("No worries. Here's your badge.", "no worries here is your");
    expect(d.map((w) => w.ok)).toEqual([true, true, true, true, false]);
  });
});

describe("historia en la sesión", () => {
  const story = (validateStory(RAW_STORY, ctx) as { ok: true; value: Story }).value;
  it("reemplaza las frases sueltas por la historia en el bloque Escucha", () => {
    const steps = buildSession(MOCK_LESSONS[1], [], story);
    expect(steps.some((s) => s.kind === "example")).toBe(false);
    expect(steps.filter((s) => s.kind === "story_question")).toHaveLength(4);
    const order = steps.map(blockOf).filter(Boolean);
    expect(order.indexOf("listen")).toBeGreaterThan(order.indexOf("learn"));
    expect(order.indexOf("listen")).toBeLessThan(order.indexOf("vocab"));
  });
  it("sin historia sigue usando las frases de la lección", () => {
    expect(buildSession(MOCK_LESSONS[1]).some((s) => s.kind === "example")).toBe(true);
  });
  it("orden: escuchar → preguntas → transcripción → dictado", () => {
    expect(buildStorySteps(story).map((s) => s.kind)).toEqual([
      "story_listen", "story_question", "story_question", "story_question", "story_question",
      "story_transcript", "story_dictation", "story_dictation",
    ]);
  });
});

describe("biblioteca de historias", () => {
  const story = (validateStory(RAW_STORY, ctx) as { ok: true; value: Story }).value;
  it("muestra solo temas completados y el actual, el actual primero", () => {
    const items = buildLibrary({
      stories: [
        { cache_key: "A1_a", content: story },
        { cache_key: "A1_b", content: story },
        { cache_key: "A1_c", content: story },
      ],
      topics: [
        { topic_key: "A1_a", title: "A", position: 1 },
        { topic_key: "A1_b", title: "B", position: 2 },
        { topic_key: "A1_c", title: "C", position: 3 },
      ],
      completed: ["A1_a"],
      nextTopic: "A1_b",
    });
    expect(items.map((i) => i.topic_key)).toEqual(["A1_b", "A1_a"]);
    expect(items[0].isNew).toBe(true);
  });
  it("detecta si la escucha es el punto débil", () => {
    expect(listeningIsWeak({ grammar: { pct: 60 }, vocab: { pct: 55 }, reading: { pct: 70 }, listening: { pct: 40 } })).toBe(true);
    expect(listeningIsWeak({ grammar: { pct: 30 }, listening: { pct: 40 } })).toBe(false);
    expect(listeningIsWeak(null)).toBe(false);
  });
});
