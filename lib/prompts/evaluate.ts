// lib/prompts/evaluate.ts — P4: evaluar un texto escrito por el estudiante
import type { CefrLevel } from "@/lib/schemas/lesson";
import { BASE_SYSTEM } from "./base";

export function evaluatePrompt(i: { level: CefrLevel; topic_key: string; task: string; text: string }) {
  const spanish = i.level === "A1" || i.level === "A2" || i.level === "B1";
  return {
    system: BASE_SYSTEM,
    user: `TAREA: evalúa este writing de nivel ${i.level}, tema ${i.topic_key}.
Consigna que recibió el estudiante: """${i.task}"""
Texto del estudiante: """${i.text}"""

Devuelve:
- corrections: cada error real (máximo 10, los más importantes primero). "wrong" = el fragmento exacto que escribió;
  "right" = la forma correcta; "explanation" = el porqué en UNA línea ${spanish ? "en español" : "en inglés"};
  "error_type" en snake_case inglés (third_person_s, verb_to_be_agreement, article_missing, preposition, word_order,
  spelling, capitalization, false_friend…). Si el texto no tiene errores, devuelve una lista vacía.
- improved_version: el texto corregido y natural en inglés americano, sin subir más de un nivel sobre ${i.level}.
- score: 0 a 100 según el nivel ${i.level} (cumplimiento de la consigna, gramática, vocabulario, claridad).
- strengths: máximo 2 cosas que hizo bien, ${spanish ? "en español" : "en inglés"}, concretas.
- next_focus: UNA sola cosa en la que debe enfocarse, ${spanish ? "en español" : "en inglés"}.
Sé exigente y cálido. No inventes errores.`,
  };
}

export const evaluateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["corrections", "improved_version", "score", "strengths", "next_focus"],
  properties: {
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["wrong", "right", "explanation", "error_type"],
        properties: {
          wrong: { type: "string" },
          right: { type: "string" },
          explanation: { type: "string" },
          error_type: { type: "string" },
        },
      },
    },
    improved_version: { type: "string" },
    score: { type: "integer" },
    strengths: { type: "array", items: { type: "string" } },
    next_focus: { type: "string" },
  },
} as const;
