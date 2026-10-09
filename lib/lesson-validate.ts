// lib/lesson-validate.ts
// Revisa y normaliza lo que devuelve la IA antes de guardarlo en caché.
// Si algo no cumple, la lección se rechaza (y se reintenta) en vez de mostrar un ejercicio roto.
import { normalize } from "./grade";
import type {
  CefrLevel,
  ClosedExercise,
  Exercise,
  Lesson,
  OpenExercise,
} from "./schemas/lesson";

type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strArr = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

export function toSnakeCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function closedExercise(raw: Record<string, unknown>, id: string, errors: string[]): ClosedExercise | null {
  const type = raw.type;
  const prompt = str(raw.prompt);
  const answer = str(raw.answer);
  const error_type = toSnakeCase(str(raw.error_type)) || "general";
  if (!prompt || !answer) {
    errors.push(`${id}: falta prompt o answer`);
    return null;
  }

  if (type === "multiple_choice") {
    const options = [...new Set(strArr(raw.options))];
    const match = options.find((o) => normalize(o) === normalize(answer));
    if (options.length < 2 || options.length > 5) errors.push(`${id}: opciones inválidas`);
    else if (!match) errors.push(`${id}: la respuesta no está entre las opciones`);
    else return { id, type, prompt, options, answer: match, error_type };
    return null;
  }

  if (type === "fill_blank") {
    if (!prompt.includes("___")) errors.push(`${id}: fill_blank sin "___"`);
    else if (answer.split(/\s+/).length > 4) errors.push(`${id}: respuesta demasiado larga`);
    else return { id, type, prompt, answer, error_type };
    return null;
  }

  if (type === "word_order") {
    const words = strArr(raw.words);
    const fromWords = words.map(normalize).sort();
    const fromAnswer = normalize(answer).split(" ").sort();
    if (words.length < 2 || words.length > 14) errors.push(`${id}: cantidad de palabras inválida`);
    else if (JSON.stringify(fromWords) !== JSON.stringify(fromAnswer))
      errors.push(`${id}: las palabras no coinciden con la respuesta`);
    else return { id, type, prompt, words, answer: answer.replace(/[.!]$/, ""), error_type };
    return null;
  }

  errors.push(`${id}: tipo cerrado desconocido`);
  return null;
}

export function validateLesson(
  raw: unknown,
  ctx: { topic_key: string; cefr_level: CefrLevel },
): Result<Lesson> {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["La respuesta no es un objeto"] };

  const title = str(raw.title);
  const explanation_es = str(raw.explanation_es);
  if (!title) errors.push("Falta title");
  if (explanation_es.length < 250) errors.push("Explicación demasiado corta");

  const translate = ["A1", "A2", "B1"].includes(ctx.cefr_level);
  const seenEn = new Set<string>();
  const examples = (Array.isArray(raw.examples) ? raw.examples : [])
    .filter(isObj)
    .map((e) => ({ en: str(e.en), es: translate ? str(e.es) || null : null }))
    .filter((e) => e.en && !seenEn.has(e.en) && seenEn.add(e.en));
  if (examples.length < 4 || examples.length > 8) errors.push(`Ejemplos: ${examples.length} (se esperan 6)`);
  if (translate && examples.some((e) => !e.es)) errors.push("Faltan traducciones en los ejemplos");

  const seenWord = new Set<string>();
  const vocabulary = (Array.isArray(raw.vocabulary) ? raw.vocabulary : [])
    .filter(isObj)
    .map((v) => ({ word: str(v.word), meaning_es: str(v.meaning_es), example: str(v.example) }))
    .filter((v) => v.word && v.meaning_es && v.example)
    .filter((v) => !seenWord.has(v.word.toLowerCase()) && seenWord.add(v.word.toLowerCase()));
  if (vocabulary.length < 6 || vocabulary.length > 10) errors.push(`Vocabulario: ${vocabulary.length} (se esperan 8)`);

  const rawExercises = (Array.isArray(raw.exercises) ? raw.exercises : []).filter(isObj);
  const closed: ClosedExercise[] = [];
  const open: OpenExercise[] = [];
  let n = 0;
  for (const ex of rawExercises) {
    if (ex.type === "writing" || ex.type === "speaking") {
      const prompt = str(ex.prompt);
      if (prompt && !open.some((o) => o.type === ex.type)) {
        open.push({ id: "", type: ex.type, prompt });
      }
      continue;
    }
    n += 1;
    const c = closedExercise(ex, `e${n}`, errors);
    if (c) closed.push(c);
  }
  if (closed.length < 5 || closed.length > 8) errors.push(`Ejercicios cerrados válidos: ${closed.length} (se esperan 6)`);
  if (!open.some((o) => o.type === "writing")) errors.push("Falta el ejercicio de writing");
  if (!open.some((o) => o.type === "speaking")) errors.push("Falta el ejercicio de speaking");

  if (errors.length) return { ok: false, errors };

  // IDs únicos y estables: e1…eN (el calificador y las respuestas dependen de ellos)
  const exercises: Exercise[] = [...closed, ...open].map((e, i) => ({ ...e, id: `e${i + 1}` }));

  return {
    ok: true,
    value: {
      topic_key: ctx.topic_key,
      title,
      cefr_level: ctx.cefr_level,
      explanation_es,
      examples,
      vocabulary,
      exercises,
    },
  };
}

export type CurriculumTopic = {
  topic_key: string;
  title: string;
  objectives: string[];
  skills: string[];
};

export function validateCurriculum(raw: unknown, level: CefrLevel): Result<CurriculumTopic[]> {
  if (!isObj(raw) || !Array.isArray(raw.topics)) return { ok: false, errors: ["Falta topics"] };
  const seen = new Set<string>();
  const topics: CurriculumTopic[] = [];
  for (const t of raw.topics.filter(isObj)) {
    let key = toSnakeCase(str(t.topic_key));
    const prefix = `${level.toLowerCase()}_`;
    if (key.startsWith(prefix)) key = key.slice(prefix.length);
    const topic_key = `${level}_${key}`;
    const title = str(t.title);
    const objectives = strArr(t.objectives);
    const skills = [...new Set(strArr(t.skills))];
    if (!key || !title || objectives.length === 0 || seen.has(topic_key)) continue;
    seen.add(topic_key);
    topics.push({ topic_key, title, objectives: objectives.slice(0, 5), skills });
  }
  if (topics.length < 15 || topics.length > 35) {
    return { ok: false, errors: [`Temas válidos: ${topics.length} (se esperan 20-30)`] };
  }
  return { ok: true, value: topics };
}
