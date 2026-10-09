// lib/prompts/lesson.ts — P3: lección de un tema
import type { CefrLevel } from "@/lib/schemas/lesson";
import { BASE_SYSTEM } from "./base";

export type LessonPromptInput = {
  level: CefrLevel;
  topic_key: string;
  title: string;
  objectives: string[];
  frequentErrors: string[];
  variant: number;
};

export function lessonPrompt(i: LessonPromptInput) {
  const translate = i.level === "A1" || i.level === "A2" || i.level === "B1";
  return {
    system: BASE_SYSTEM,
    user: `TAREA: lección del tema ${i.topic_key} (${i.title}), nivel ${i.level}.
Objetivos: ${i.objectives.join(" | ")}
Errores frecuentes sin resolver del estudiante: ${i.frequentErrors.length ? i.frequentErrors.join(", ") : "ninguno todavía"}
Variante ${i.variant}: usa contextos y ejemplos distintos a los de otras variantes del mismo tema.

Estructura obligatoria:
- title: en inglés.
- explanation_es: explicación clara del tema con el idioma que corresponde al nivel ${i.level}.
- examples: exactamente 6, situaciones reales en EE. UU. "es" = traducción al español${translate ? "" : " → en este nivel pon null"}.
- vocabulary: exactamente 8 palabras o expresiones distintas, con meaning_es y una oración de ejemplo.
- exercises: exactamente 8, en este orden: 6 cerrados, luego 1 "writing" y 1 "speaking".
  Cerrados (mezcla los 3 tipos, al menos uno de cada uno):
  · multiple_choice: prompt con "___"; options con 3 opciones distintas; answer idéntica a una de las options; words = null.
  · fill_blank: prompt con "___" y el verbo o pista entre paréntesis si aplica; answer de 1 a 3 palabras; options = null; words = null.
  · word_order: prompt = instrucción corta en español; words = TODAS las palabras de answer, desordenadas, sin puntuación; answer = la frase correcta sin punto final; options = null.
  · Cada cerrado lleva error_type en snake_case inglés.${i.frequentErrors.length ? " Al menos 2 cerrados atacan los errores frecuentes del estudiante." : ""}
  writing y speaking: prompt con la consigna (en español para A1-B1); options, words, answer y error_type = null.
- id de ejercicios: "e1" a "e8".`,
  };
}

export const lessonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "explanation_es", "examples", "vocabulary", "exercises"],
  properties: {
    title: { type: "string" },
    explanation_es: { type: "string" },
    examples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["en", "es"],
        properties: { en: { type: "string" }, es: { type: ["string", "null"] } },
      },
    },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "meaning_es", "example"],
        properties: {
          word: { type: "string" },
          meaning_es: { type: "string" },
          example: { type: "string" },
        },
      },
    },
    exercises: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "prompt", "options", "words", "answer", "error_type"],
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: ["multiple_choice", "fill_blank", "word_order", "writing", "speaking"],
          },
          prompt: { type: "string" },
          options: { type: ["array", "null"], items: { type: "string" } },
          words: { type: ["array", "null"], items: { type: "string" } },
          answer: { type: ["string", "null"] },
          error_type: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;
