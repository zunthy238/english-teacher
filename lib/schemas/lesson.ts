// lib/schemas/lesson.ts
// Contrato de una lección (manual 5.4 + prompt P3).
// CP-0.5: lo usan las lecciones de prueba. CP-3: la IA debe cumplirlo.

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1";

// "es" es null desde B2 (sin traducción). Se usa null y no "opcional"
// porque Structured Outputs en modo estricto exige todos los campos.
export type Example = { en: string; es: string | null };

export type VocabularyItem = {
  word: string;
  meaning_es: string;
  example: string;
};

type BaseExercise = { id: string; prompt: string };

// Respuestas alternativas igual de válidas (otro orden natural, otra forma correcta).
// Las contracciones (doesn't = does not) ya se aceptan siempre en lib/grade.ts.
type Accepts = { accepted?: string[] };

export type MultipleChoiceExercise = BaseExercise & Accepts & {
  type: "multiple_choice";
  options: string[];
  answer: string;
  error_type: string;
};

export type FillBlankExercise = BaseExercise & Accepts & {
  type: "fill_blank";
  answer: string;
  error_type: string;
};

export type WordOrderExercise = BaseExercise & Accepts & {
  type: "word_order";
  words: string[]; // palabras desordenadas
  answer: string; // frase correcta completa
  error_type: string;
};

export type WritingExercise = BaseExercise & { type: "writing" };
export type SpeakingExercise = BaseExercise & { type: "speaking" };

// Cerrados: se califican en el dispositivo, sin API.
export type ClosedExercise =
  | MultipleChoiceExercise
  | FillBlankExercise
  | WordOrderExercise;

// Abiertos: los corrige la IA (CP-4 y CP-5).
export type OpenExercise = WritingExercise | SpeakingExercise;

export type Exercise = ClosedExercise | OpenExercise;

export type Lesson = {
  topic_key: string; // ej. A1_present_simple
  title: string;
  cefr_level: CefrLevel;
  explanation_es: string;
  examples: Example[]; // 6
  vocabulary: VocabularyItem[]; // 8
  exercises: Exercise[]; // 6 cerrados + 1 writing + 1 speaking
};

export function isClosedExercise(e: Exercise): e is ClosedExercise {
  return (
    e.type === "multiple_choice" ||
    e.type === "fill_blank" ||
    e.type === "word_order"
  );
}