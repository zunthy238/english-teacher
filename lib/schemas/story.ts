// lib/schemas/story.ts
// Contrato de una historia para ESCUCHAR (Fase C): diálogo corto de 2 personas sobre el tema del día.
import type { CefrLevel } from "./lesson";

export type StorySpeaker = { name: string; gender: "female" | "male" };
export type StoryLine = { speaker: 0 | 1; en: string; es: string };
export type StoryQuestion = {
  question: string; // en inglés
  options: string[]; // 3
  answer: string; // idéntica a una opción
  line: number; // índice de la línea donde está la respuesta (para "Oír esa parte")
  explanation_es: string;
};

export type Story = {
  topic_key: string;
  cefr_level: CefrLevel;
  title: string;
  scene_emoji: string;
  setting_es: string;
  speakers: [StorySpeaker, StorySpeaker];
  key_words: { word: string; meaning_es: string }[]; // 3
  lines: StoryLine[]; // 8-14
  questions: StoryQuestion[]; // 4: la 1ª es de idea general
  dictation: number[]; // 1-2 índices de líneas cortas
};
