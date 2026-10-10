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
- explanation_es: explicación COMPLETA del tema, como la daría un buen profesor en clase (entre 150 y 300 palabras),
  en el idioma que corresponde al nivel ${i.level}. Incluye: la regla o el uso con ejemplos cortos, las formas
  (afirmativa, negativa y pregunta si aplica), los errores típicos de hispanohablantes con este tema y una nota
  de pronunciación americana cuando sea útil. Usa saltos de línea para separar las partes.
- examples: exactamente 6, situaciones reales en EE. UU. "es" = traducción al español${translate ? "" : " → en este nivel pon null"}.
- vocabulary: exactamente 8 palabras o expresiones distintas, con meaning_es y una oración de ejemplo.
- exercises: exactamente 8, en este orden: 6 cerrados, luego 1 "writing" y 1 "speaking".
  Cerrados (mezcla los 3 tipos, al menos uno de cada uno). REGLA DE ORO: cada cerrado tiene UNA sola respuesta
  correcta posible; si hubiera otra igual de válida, ponla en accepted_answers.
  · multiple_choice: prompt con "___" y contexto suficiente para que SOLO una opción sea correcta
    (MAL: "What is your ___?" con job/name/age, porque las tres sirven; BIEN: "My ___ is Ana." con name/job/age).
    3 opciones distintas; answer idéntica a una de las options; words = null.
  · fill_blank: prompt con "___". Si das pista entre paréntesis, es la forma base del verbo, ej. "(watch)", "(not/go)";
    NUNCA pongas la respuesta como pista. answer = SOLO las palabras que faltan, sin repetir las que ya están en la frase
    (MAL: "My friend is ___ Spain." con answer "from Spain"; BIEN: answer "from"). options = null; words = null.
  · word_order: prompt = SOLO la instrucción "Ordena las palabras para formar la frase." (nunca incluyas la frase);
    words = TODAS las palabras de answer, desordenadas, sin puntuación; answer = la frase correcta sin punto final;
    usa frases con un solo orden natural (evita listas como "goodbye see you later"); options = null.
  · accepted_answers: otras respuestas igual de correctas (otro orden natural, sinónimo exacto en contexto); si no hay, null.
    No hace falta incluir contracciones (doesn't / does not): la app ya las acepta.
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
        required: ["id", "type", "prompt", "options", "words", "answer", "accepted_answers", "error_type"],
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
          accepted_answers: { type: ["array", "null"], items: { type: "string" } },
          error_type: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;
