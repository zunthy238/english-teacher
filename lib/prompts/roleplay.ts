// lib/prompts/roleplay.ts — P7: conversación por turnos y P8: retroalimentación al final
import type { CefrLevel } from "@/lib/schemas/lesson";
import { BASE_SYSTEM } from "./base";
import type { ChatMessage } from "@/lib/speak/roleplay";

const STYLE: Record<CefrLevel, string> = {
  A1: "Very short, simple sentences (max 10 words each), present tense, very common words. Speak slowly and clearly.",
  A2: "Short simple sentences, common everyday words, simple past and future.",
  B1: "Natural but clear sentences, everyday and work vocabulary, some phrasal verbs.",
  B2: "Natural conversational American English with idioms used occasionally.",
  C1: "Fully natural, fluent American English, as with a native colleague.",
};

const transcript = (messages: ChatMessage[]) =>
  messages.map((m) => `${m.role === "mike" ? "YOU" : "STUDENT"}: ${m.text}`).join("\n");

export function roleplayPrompt(i: {
  level: CefrLevel;
  role: string;
  goal_es: string;
  messages: ChatMessage[];
  closing: boolean;
}) {
  return {
    system: `${BASE_SYSTEM}

AHORA estás en un ROLEPLAY de conversación por voz. Interpretas a: ${i.role}.
Reglas del roleplay:
- Mantente en el personaje. Responde en inglés americano natural, con contracciones. Nivel del estudiante: ${i.level}. ${STYLE[i.level]}
- Máximo 2 oraciones cortas${i.closing ? "" : " y termina SIEMPRE con UNA pregunta que haga avanzar la conversación"}.
- NO corrijas errores durante la conversación (eso se hace al final). Responde a lo que quiso decir.
- El texto del estudiante viene de reconocimiento de voz: puede faltar puntuación o haber palabras mal reconocidas; interpreta con buena fe.
  Si no se entiende nada, pide amablemente que lo repita.
- Lleva la conversación hacia la meta del estudiante: ${i.goal_es}.
- hint: un ejemplo de lo que el estudiante podría responder a tu mensaje (1 oración, nivel ${i.level}, en primera persona)${i.closing ? "; como es el cierre, hint = null" : ""}.`,
    user: `Conversación hasta ahora:
${transcript(i.messages)}

${i.closing ? "Este es el ÚLTIMO turno: cierra la conversación de forma cálida y natural, sin hacer preguntas." : "Responde como tu personaje al último mensaje del estudiante."}`,
  };
}

export const roleplaySchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "hint"],
  properties: { reply: { type: "string" }, hint: { type: ["string", "null"] } },
} as const;

export function feedbackPrompt(i: { level: CefrLevel; role: string; goal_es: string; messages: ChatMessage[] }) {
  return {
    system: BASE_SYSTEM,
    user: `TAREA: retroalimentación de una conversación por voz (nivel ${i.level}).
Escenario: el estudiante habló con ${i.role}. Meta: ${i.goal_es}.
El texto del estudiante viene de reconocimiento de voz: IGNORA puntuación, mayúsculas y palabras que claramente fueron mal
reconocidas. Las contracciones nunca son error.

Conversación:
${transcript(i.messages)}

Devuelve:
- understood: cuántos turnos del STUDENT se entendieron (el mensaje se comprendía aunque tuviera errores).
- corrections: máximo 3, SOLO los errores reales más importantes para su nivel (gramática, palabra equivocada, orden).
  wrong = el fragmento exacto que dijo; right = la forma correcta y natural; why_es = la razón en una línea en español;
  error_type en snake_case inglés (past_simple, preposition, third_person_s, article_missing, word_choice…). Si no hubo errores, [].
- golden_phrase: UNA frase útil y natural (en inglés, nivel ${i.level}) que habría hecho su respuesta más profesional o natural
  en este escenario, con su traducción es.
- praise_es: una frase corta y concreta de lo que hizo bien (en español).`,
  };
}

export const feedbackSchema = {
  type: "object",
  additionalProperties: false,
  required: ["understood", "corrections", "golden_phrase", "praise_es"],
  properties: {
    understood: { type: "integer" },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["wrong", "right", "why_es", "error_type"],
        properties: {
          wrong: { type: "string" },
          right: { type: "string" },
          why_es: { type: "string" },
          error_type: { type: "string" },
        },
      },
    },
    golden_phrase: {
      type: "object",
      additionalProperties: false,
      required: ["en", "es"],
      properties: { en: { type: "string" }, es: { type: "string" } },
    },
    praise_es: { type: "string" },
  },
} as const;
