// lib/prompts/story.ts — P6: historia para escuchar (una por tema, compartida por todos los usuarios)
import type { CefrLevel } from "@/lib/schemas/lesson";
import { BASE_SYSTEM } from "./base";

// Palabras totales del diálogo por nivel (el validador usa los mismos rangos con margen)
export const STORY_WORDS: Record<CefrLevel, [number, number]> = {
  A1: [60, 110],
  A2: [90, 150],
  B1: [130, 200],
  B2: [170, 250],
  C1: [200, 290],
};

export function storyPrompt(i: { level: CefrLevel; topic_key: string; title: string; objectives: string[] }) {
  const [min, max] = STORY_WORDS[i.level];
  return {
    system: BASE_SYSTEM,
    user: `TAREA: historia corta para ESCUCHAR del tema ${i.topic_key} (${i.title}), nivel ${i.level}.
Objetivos del tema: ${i.objectives.join(" | ")}

Reglas:
- Diálogo entre 2 personas (una mujer y un hombre, nombres comunes en EE. UU.) en una situación REAL de trabajo o
  vida diaria en Estados Unidos: primer día en la oficina, reunión, llamada con un cliente, entrevista de trabajo,
  café con colegas, soporte técnico, viaje de negocios, etc. Elige la que mejor encaje con el tema.
- Usa la gramática/vocabulario del tema VARIAS veces de forma natural (es el objetivo pedagógico).
- Inglés americano natural, como se habla: contracciones (I'm, don't, it's, we'll, I'd), saludos y muletillas reales.
- Longitud total: entre ${min} y ${max} palabras en inglés, en 8 a 14 líneas. Cada línea = lo que dice una persona,
  máximo 2 oraciones cortas. Vocabulario adecuado al nivel ${i.level}.
- lines: speaker = 0 o 1 (índice en speakers); en = la frase en inglés; es = traducción natural al español.
- title: en inglés, máximo 6 palabras. scene_emoji: 1 o 2 emojis de la escena. setting_es: una frase corta en español
  que sitúa la escena sin contar el final.
- key_words: exactamente 3 palabras o expresiones QUE APARECEN en el diálogo y que el estudiante quizá no conoce,
  con meaning_es breve.
- questions: exactamente 4, en inglés simple del nivel. La 1ª es de IDEA GENERAL ("What is the conversation mainly about?"),
  las otras 3 de DETALLE. Cada una: 3 opciones plausibles y distintas, UNA sola correcta que se responde solo escuchando;
  answer idéntica a una de las options; line = índice (desde 0) de la línea que contiene la respuesta (para la 1ª, la
  línea más representativa); explanation_es = por qué es la correcta citando las palabras clave (máximo 25 palabras).
- dictation: índices (desde 0) de 2 líneas cortas (4 a 12 palabras) con contracciones o uniones típicas del habla.`,
  };
}

export const storySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "scene_emoji", "setting_es", "speakers", "key_words", "lines", "questions", "dictation"],
  properties: {
    title: { type: "string" },
    scene_emoji: { type: "string" },
    setting_es: { type: "string" },
    speakers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "gender"],
        properties: { name: { type: "string" }, gender: { type: "string", enum: ["female", "male"] } },
      },
    },
    key_words: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "meaning_es"],
        properties: { word: { type: "string" }, meaning_es: { type: "string" } },
      },
    },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speaker", "en", "es"],
        properties: { speaker: { type: "integer", enum: [0, 1] }, en: { type: "string" }, es: { type: "string" } },
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "answer", "line", "explanation_es"],
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
          line: { type: "integer" },
          explanation_es: { type: "string" },
        },
      },
    },
    dictation: { type: "array", items: { type: "integer" } },
  },
} as const;
