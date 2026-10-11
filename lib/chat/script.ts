// lib/chat/script.ts
// Mike Chat: convierte la lección (y la historia) del tema en una CONVERSACIÓN guiada (funciones puras, probadas).
// No usa IA: reutiliza el contenido ya generado y guardado en caché. Solo el reto final (producir) pasa por la IA.
import { chunkExplanation } from "../session-plan";
import { isClosedExercise, type CefrLevel, type ClosedExercise, type Lesson, type VocabularyItem } from "../schemas/lesson";
import type { Story } from "../schemas/story";
import type { ReviewItem } from "../review-input";

export type ChatStep =
  | { id: string; kind: "say"; text: string; en?: string; es?: string | null; rule?: boolean }
  | { id: string; kind: "pause"; label: string }
  | { id: string; kind: "vocab"; items: VocabularyItem[] }
  | { id: string; kind: "repeat"; en: string; es: string | null }
  | { id: string; kind: "exercise"; exercise: ClosedExercise }
  | { id: string; kind: "story" }
  | { id: string; kind: "listen"; q: number }
  | { id: string; kind: "review"; card: ReviewCardLite }
  | { id: string; kind: "retry" }
  | { id: string; kind: "produce"; task: string }
  | { id: string; kind: "done" };

// Un paso sin id (el id se asigna en orden)
type StepInput = ChatStep extends infer S ? (S extends ChatStep ? Omit<S, "id"> : never) : never;

export type ReviewCardLite = Pick<ReviewItem, "id" | "kind" | "front" | "back" | "extra">;

// Mike habla en español hasta B1 y en inglés desde B2 (igual que las explicaciones)
export function mikeLang(level: CefrLevel): "es" | "en" {
  return level === "B2" || level === "C1" ? "en" : "es";
}

export const T = {
  es: {
    greet: (title: string) => `¡Hola! 👋 Soy Professor Mike. Hoy aprendemos: *${title}*.`,
    go: "¡Vamos! 🚀",
    reviewIntro: "Antes de empezar, un repaso rápido de lo que estás por olvidar 🧠",
    example: "Escucha este ejemplo 🔊",
    understood: "Entendido 👍",
    repeat: "Ahora tú: mándame una nota de voz repitiendo esta frase 🎙️",
    vocab: "Palabras nuevas de hoy. Toca cada una para oírla 👇",
    practice: "¡Ahora a practicar! Responde aquí abajo ✍️",
    story: "Te cuento una historia corta. Escúchala completa 🎧",
    retry: "Repasemos las que fallaste. Esta vez sin pistas 💪",
    produce: "🎯 Reto final. Respóndeme con tus palabras (escribe o dicta con el micrófono):",
    another: "Otro ejemplo:",
  },
  en: {
    greet: (title: string) => `Hi there! 👋 I'm Professor Mike. Today's topic: *${title}*.`,
    go: "Let's go! 🚀",
    reviewIntro: "Before we start, a quick review of what you're about to forget 🧠",
    example: "Listen to this example 🔊",
    understood: "Got it 👍",
    repeat: "Your turn: send me a voice note repeating this sentence 🎙️",
    vocab: "Today's new words. Tap each one to hear it 👇",
    practice: "Time to practice! Answer below ✍️",
    story: "Here's a short story. Listen to the whole thing 🎧",
    retry: "Let's go over the ones you missed. No hints this time 💪",
    produce: "🎯 Final challenge. Answer in your own words (type or dictate):",
    another: "Another example:",
  },
} as const;

export function buildChatScript(input: {
  lesson: Lesson;
  story: Story | null;
  level: CefrLevel;
  review?: ReviewCardLite[];
}): ChatStep[] {
  const { lesson, story, level } = input;
  const t = T[mikeLang(level)];
  const steps: ChatStep[] = [];
  let n = 0;
  const add = (s: StepInput) => steps.push({ ...s, id: `s${n++}` } as ChatStep);

  const closed = lesson.exercises.filter(isClosedExercise);
  const half = Math.ceil(closed.length / 2);
  const ex = lesson.examples;

  add({ kind: "say", text: t.greet(lesson.title) });
  add({ kind: "pause", label: t.go });

  // Repaso espaciado dentro del chat (máx. 3 tarjetas)
  const review = (input.review ?? []).slice(0, 3);
  if (review.length) {
    add({ kind: "say", text: t.reviewIntro });
    for (const card of review) add({ kind: "review", card });
  }

  // Aprende: un ejemplo con audio, la regla en tarjetas cortas, y repetir
  if (ex[0]) add({ kind: "say", text: t.example, en: ex[0].en, es: ex[0].es });
  for (const chunk of chunkExplanation(lesson.explanation_es)) add({ kind: "say", text: chunk, rule: true });
  add({ kind: "pause", label: t.understood });
  if (ex[0]) {
    add({ kind: "say", text: t.repeat });
    add({ kind: "repeat", en: ex[0].en, es: ex[0].es });
  }

  // Vocabulario
  if (lesson.vocabulary.length) {
    add({ kind: "say", text: t.vocab });
    add({ kind: "vocab", items: lesson.vocabulary.slice(0, 6) });
  }

  // Practica (primera mitad), otro ejemplo para repetir, historia, práctica (segunda mitad)
  add({ kind: "say", text: t.practice });
  for (const e of closed.slice(0, half)) add({ kind: "exercise", exercise: e });
  if (ex[1]) {
    add({ kind: "say", text: t.another });
    add({ kind: "repeat", en: ex[1].en, es: ex[1].es });
  }
  if (story) {
    add({ kind: "say", text: t.story });
    add({ kind: "story" });
    story.questions.slice(0, 3).forEach((_, q) => add({ kind: "listen", q }));
  }
  for (const e of closed.slice(half)) add({ kind: "exercise", exercise: e });
  if (ex[2]) {
    add({ kind: "say", text: t.repeat });
    add({ kind: "repeat", en: ex[2].en, es: ex[2].es });
  }

  // Lo fallado vuelve al final (recuperación espaciada dentro de la lección)
  add({ kind: "retry" });
  const writing = lesson.exercises.find((e) => e.type === "writing");
  if (writing) {
    add({ kind: "say", text: t.produce });
    add({ kind: "produce", task: writing.prompt });
  }
  add({ kind: "done" });
  return steps;
}

// Pasos que esperan al estudiante (los demás los envía Mike solo)
export function isInteractive(step: ChatStep): boolean {
  return ["pause", "repeat", "exercise", "listen", "review", "produce", "done"].includes(step.kind);
}

// Puntaje de dominio: acierto al primer intento = 1; acertado al repasar = 0.5
export function masteryScore(first: Record<string, boolean>, recovered: string[]): number {
  const ids = Object.keys(first);
  if (!ids.length) return 0;
  const points = ids.reduce((sum, id) => sum + (first[id] ? 1 : recovered.includes(id) ? 0.5 : 0), 0);
  return Math.round((points / ids.length) * 100);
}
