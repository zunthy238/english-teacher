// lib/story-validate.ts
// Revisa y normaliza la historia que devuelve la IA antes de guardarla (función pura, probada).
// Si algo esencial falla, se rechaza y se reintenta: nunca se muestra una historia rota.
import { expandContractions, normalize } from "./grade";
import { STORY_WORDS } from "./prompts/story";
import type { CefrLevel } from "./schemas/lesson";
import type { Story, StoryLine, StoryQuestion, StorySpeaker } from "./schemas/story";

type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
export const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function validateStory(raw: unknown, ctx: { topic_key: string; cefr_level: CefrLevel }): Result<Story> {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["no es un objeto"] };

  const title = str(raw.title).slice(0, 80);
  if (!title) errors.push("falta title");
  const scene_emoji = str(raw.scene_emoji).slice(0, 12) || "🎧";
  const setting_es = str(raw.setting_es).slice(0, 200);

  // Hablantes
  const speakers = (Array.isArray(raw.speakers) ? raw.speakers : [])
    .filter(isObj)
    .map((s): StorySpeaker => ({ name: str(s.name).slice(0, 30), gender: s.gender === "male" ? "male" : "female" }))
    .filter((s) => s.name);
  if (speakers.length !== 2 || speakers[0].name === speakers[1].name) errors.push("se necesitan 2 hablantes distintos");

  // Líneas
  const lines: StoryLine[] = (Array.isArray(raw.lines) ? raw.lines : []).filter(isObj).map((l) => ({
    speaker: l.speaker === 1 ? 1 : 0,
    en: str(l.en),
    es: str(l.es),
  }));
  if (lines.length < 8 || lines.length > 14) errors.push(`líneas: ${lines.length} (deben ser 8-14)`);
  if (lines.some((l) => !l.en || !l.es)) errors.push("hay líneas vacías o sin traducción");
  if (lines.some((l) => l.en.length > 240)) errors.push("hay líneas demasiado largas");
  if (!lines.some((l) => l.speaker === 0) || !lines.some((l) => l.speaker === 1)) errors.push("hablan los dos");

  const [min, max] = STORY_WORDS[ctx.cefr_level];
  const total = lines.reduce((n, l) => n + wordCount(l.en), 0);
  if (total < min * 0.75 || total > max * 1.3) errors.push(`longitud ${total} palabras fuera de rango ${min}-${max}`);

  const transcript = normalize(lines.map((l) => l.en).join(" "));

  // Palabras clave: deben aparecer en el diálogo
  const key_words = (Array.isArray(raw.key_words) ? raw.key_words : [])
    .filter(isObj)
    .map((k) => ({ word: str(k.word), meaning_es: str(k.meaning_es) }))
    .filter((k) => k.word && k.meaning_es && transcript.includes(normalize(k.word)))
    .slice(0, 3);
  if (key_words.length < 2) errors.push("faltan palabras clave que aparezcan en el diálogo");

  // Preguntas
  const questions: StoryQuestion[] = [];
  for (const q of (Array.isArray(raw.questions) ? raw.questions : []).filter(isObj)) {
    const options = [...new Set((Array.isArray(q.options) ? q.options : []).map(str).filter(Boolean))];
    const given = str(q.answer);
    const answer = options.find((o) => o === given) ?? options.find((o) => normalize(o) === normalize(given));
    const line = typeof q.line === "number" && Number.isInteger(q.line) ? q.line : -1;
    if (!str(q.question) || options.length !== 3 || !answer || line < 0 || line >= lines.length) continue;
    questions.push({ question: str(q.question), options, answer, line, explanation_es: str(q.explanation_es) });
  }
  if (questions.length < 4) errors.push(`preguntas válidas: ${questions.length} (se necesitan 4)`);

  // Dictado: líneas cortas válidas; si la IA no eligió bien, se escogen automáticamente
  const fits = (i: number) => i >= 0 && i < lines.length && wordCount(lines[i].en) >= 4 && wordCount(lines[i].en) <= 12;
  let dictation = [...new Set((Array.isArray(raw.dictation) ? raw.dictation : []).filter((i): i is number => Number.isInteger(i)))]
    .filter(fits)
    .slice(0, 2);
  if (dictation.length < 2) {
    const auto = lines
      .map((_, i) => i)
      .filter((i) => fits(i) && !dictation.includes(i))
      .sort((a, b) => wordCount(lines[a].en) - wordCount(lines[b].en));
    dictation = [...dictation, ...auto].slice(0, 2);
  }
  if (dictation.length === 0) errors.push("no hay líneas cortas para el dictado");

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      topic_key: ctx.topic_key,
      cefr_level: ctx.cefr_level,
      title,
      scene_emoji,
      setting_es,
      speakers: [speakers[0], speakers[1]],
      key_words,
      lines,
      questions: questions.slice(0, 4),
      dictation,
    },
  };
}

// Dictado: compara palabra por palabra (sin mayúsculas, puntuación ni diferencias de contracción)
export function diffDictation(expected: string, given: string): { word: string; ok: boolean }[] {
  const split = (t: string) => t.split(" ").filter(Boolean);
  const givenWords = new Set([...split(normalize(given)), ...split(expandContractions(given))]);
  return expected
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({
      word: w,
      ok: givenWords.has(normalize(w)) || split(expandContractions(w)).every((p) => givenWords.has(p)),
    }));
}
