// lib/prompts/curriculum.ts — P2: plan curricular de un nivel
import type { CefrLevel } from "@/lib/schemas/lesson";
import { BASE_SYSTEM } from "./base";

export const SKILLS = [
  "grammar",
  "vocabulary",
  "reading",
  "listening",
  "writing",
  "speaking",
  "pronunciation",
] as const;

export function curriculumPrompt(level: CefrLevel, exam: string) {
  return {
    system: BASE_SYSTEM,
    user: `TAREA: plan curricular completo del nivel ${level} para un adulto hispanohablante. Examen objetivo: ${exam}. Meta profesional: trabajar en Estados Unidos como desarrollador de software (Power Apps).
- Entre 20 y 30 temas en orden pedagógico; cada tema se apoya en los anteriores.
- Gramática, vocabulario por situaciones y funciones comunicativas propias del nivel según el MCER.
- Cada tema trabaja al menos 2 habilidades; speaking en la mayoría.
- Incluye temas de pronunciación americana del nivel.
- Incluye algunos temas con situaciones de trabajo en EE. UU. (oficina, reuniones, correo), sin descuidar la vida diaria.
- topic_key: "${level}_" seguido del nombre en snake_case inglés (ej.: ${level}_present_simple). Únicos.
- title: en inglés, corto y claro.
- objectives: 3 a 5, cada uno empieza con "El estudiante puede…".
- skills: solo de esta lista: ${SKILLS.join(", ")}.`,
  };
}

export const curriculumSchema = {
  type: "object",
  additionalProperties: false,
  required: ["topics"],
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic_key", "title", "objectives", "skills"],
        properties: {
          topic_key: { type: "string" },
          title: { type: "string" },
          objectives: { type: "array", items: { type: "string" } },
          skills: { type: "array", items: { type: "string", enum: [...SKILLS] } },
        },
      },
    },
  },
} as const;
