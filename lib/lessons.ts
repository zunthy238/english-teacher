// lib/lessons.ts
// Currículo y lección del día con caché compartido.
// Regla de costo: solo se llama a la IA si el tema no tiene una variante disponible en caché.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AIError, generateJson } from "@/lib/ai";
import { resolveKey } from "@/lib/keys";
import { consumeRequest } from "@/lib/quota";
import { curriculumPrompt, curriculumSchema } from "@/lib/prompts/curriculum";
import { lessonPrompt, lessonSchema } from "@/lib/prompts/lesson";
import { PROMPT_VERSION } from "@/lib/prompts/version";
import { validateCurriculum, validateLesson } from "@/lib/lesson-validate";
import type { CefrLevel, Lesson } from "@/lib/schemas/lesson";

export const MAX_VARIANTS = 3;

export class LessonError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

type Topic = { topic_key: string; title: string; objectives: string[]; position: number };

export type DailyLesson = {
  lesson: Lesson;
  meta: {
    topic_key: string;
    title: string;
    position: number;
    total: number;
    variant: number;
    source: "cache" | "ai";
  };
};

// Gasta 1 de cuota y devuelve la key del usuario, o lanza un error claro para la pantalla.
export async function chargeAndGetKey(userId: string) {
  const key = await resolveKey(userId);
  if (!key) throw new LessonError("Registra tu API key en Ajustes para generar lecciones.", 409, "no_key");
  const quota = await consumeRequest(userId);
  if (!quota.allowed)
    throw new LessonError(`Llegaste al límite de ${quota.limit} solicitudes de hoy. Se reinicia a medianoche.`, 429, "quota");
  return key;
}

// Llama a la IA y valida; reintenta 1 vez si la salida no cumple las reglas.
export async function generateValidated<T>(
  key: Awaited<ReturnType<typeof chargeAndGetKey>>,
  prompt: { system: string; user: string },
  schemaName: string,
  schema: object,
  validate: (raw: unknown) => { ok: true; value: T } | { ok: false; errors: string[] },
): Promise<T> {
  let lastErrors: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await generateJson({ ...key, ...prompt, schemaName, schema });
      const result = validate(raw);
      if (result.ok) return result.value;
      lastErrors = result.errors;
    } catch (e) {
      if (e instanceof AIError && e.code !== "bad_output") {
        throw new LessonError(e.message, e.code === "provider_limit" ? 402 : 502, e.code);
      }
      lastErrors = [e instanceof Error ? e.message : "error"];
    }
  }
  console.error(`[lessons] salida inválida de la IA (${schemaName}):`, lastErrors.slice(0, 5));
  throw new LessonError("La IA generó una lección con errores. Intenta de nuevo.", 502, "bad_output");
}

export async function getProfile(userId: string): Promise<{ level: CefrLevel; exam: string }> {
  const { data } = await createAdminClient()
    .from("profile")
    .select("cefr_level, target_exam")
    .eq("id", userId)
    .maybeSingle();
  return { level: (data?.cefr_level ?? "A1") as CefrLevel, exam: data?.target_exam ?? "TOEFL" };
}

async function getCurriculum(level: CefrLevel): Promise<Topic[]> {
  const { data, error } = await createAdminClient()
    .from("curriculum")
    .select("topic_key, title, objectives, position")
    .eq("cefr_level", level)
    .order("position");
  if (error) throw new LessonError("No se pudo leer el currículo.", 500, "db");
  return (data ?? []) as Topic[];
}

// El currículo de un nivel se genera una sola vez y lo comparten todos los usuarios.
async function ensureCurriculum(userId: string, level: CefrLevel, exam: string): Promise<Topic[]> {
  const existing = await getCurriculum(level);
  if (existing.length) return existing;

  const key = await chargeAndGetKey(userId);
  const topics = await generateValidated(key, curriculumPrompt(level, exam), "curriculum", curriculumSchema, (raw) =>
    validateCurriculum(raw, level),
  );
  const rows = topics.map((t, i) => ({ ...t, cefr_level: level, position: i + 1 }));
  const { error } = await createAdminClient().from("curriculum").insert(rows);
  if (error) {
    // Otra petición guardó el currículo al mismo tiempo (índice único nivel+posición): se usa ese
    const saved = await getCurriculum(level);
    if (saved.length) return saved;
    throw new LessonError("No se pudo guardar el currículo.", 500, "db");
  }
  return getCurriculum(level);
}

async function nextTopic(userId: string, topics: Topic[]): Promise<Topic> {
  const { data } = await createAdminClient()
    .from("user_topic_progress")
    .select("topic_key")
    .eq("user_id", userId)
    .eq("completed", true);
  const done = new Set((data ?? []).map((r) => r.topic_key));
  return topics.find((t) => !done.has(t.topic_key)) ?? topics[topics.length - 1];
}

async function frequentErrors(userId: string): Promise<string[]> {
  const { data } = await createAdminClient()
    .from("errors")
    .select("error_type")
    .eq("user_id", userId)
    .eq("resolved", false)
    .order("count", { ascending: false })
    .limit(5);
  return (data ?? []).map((r) => r.error_type);
}

async function markSeen(userId: string, lessonId: number) {
  await createAdminClient()
    .from("user_lesson_seen")
    .upsert({ user_id: userId, lesson_id: lessonId, seen_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" });
  await createAdminClient().rpc("increment_lesson_uses", { p_lesson: lessonId });
}

export async function getDailyLesson(userId: string, opts: { newVariant: boolean }): Promise<DailyLesson> {
  const admin = createAdminClient();
  const { level, exam } = await getProfile(userId);
  const topics = await ensureCurriculum(userId, level, exam);
  const topic = await nextTopic(userId, topics);

  // Variantes en caché de este tema (solo de la versión de prompts actual)
  const { data: cached, error } = await admin
    .from("lessons_cache")
    .select("id, variant, content")
    .eq("cache_key", topic.topic_key)
    .eq("kind", "lesson")
    .eq("prompt_version", PROMPT_VERSION)
    .order("variant");
  if (error) throw new LessonError("No se pudo leer el caché.", 500, "db");
  const variants = (cached ?? []) as { id: number; variant: number; content: Lesson }[];

  const { data: seenRows } = variants.length
    ? await admin
        .from("user_lesson_seen")
        .select("lesson_id, seen_at")
        .eq("user_id", userId)
        .in("lesson_id", variants.map((v) => v.id))
        .order("seen_at", { ascending: false })
    : { data: [] as { lesson_id: number; seen_at: string }[] };
  const seen = seenRows ?? [];

  const build = (v: { id: number; variant: number; content: Lesson }, source: "cache" | "ai"): DailyLesson => ({
    lesson: v.content,
    meta: {
      topic_key: topic.topic_key,
      title: topic.title,
      position: topic.position,
      total: topics.length,
      variant: v.variant,
      source,
    },
  });

  // 1. Misma lección al recargar: la última que vio (sin IA, sin cuota)
  if (!opts.newVariant && seen.length) {
    const last = variants.find((v) => v.id === seen[0].lesson_id)!;
    return build(last, "cache");
  }

  // 2. Variante en caché que no ha visto (sin IA, sin cuota)
  const seenIds = new Set(seen.map((s) => s.lesson_id));
  const unseen = variants.find((v) => !seenIds.has(v.id));
  if (unseen) {
    await markSeen(userId, unseen.id);
    return build(unseen, "cache");
  }

  // 3. Ya vio todas y existen las 3: vuelve a la más antigua (sin IA)
  if (variants.length >= MAX_VARIANTS) {
    const oldest = variants.find((v) => v.id === seen[seen.length - 1].lesson_id)!;
    await markSeen(userId, oldest.id);
    return build(oldest, "cache");
  }

  // 4. Generar una variante nueva con la key del usuario
  const key = await chargeAndGetKey(userId);
  const variant = (variants.at(-1)?.variant ?? 0) + 1;
  const lesson = await generateValidated(
    key,
    lessonPrompt({
      level,
      topic_key: topic.topic_key,
      title: topic.title,
      objectives: topic.objectives,
      frequentErrors: await frequentErrors(userId),
      variant,
    }),
    "lesson",
    lessonSchema,
    (raw) => validateLesson(raw, { topic_key: topic.topic_key, cefr_level: level }),
  );

  const { data: inserted, error: insertError } = await admin
    .from("lessons_cache")
    .insert({
      cache_key: topic.topic_key,
      kind: "lesson",
      variant,
      content: lesson,
      prompt_version: PROMPT_VERSION,
    })
    .select("id, variant, content")
    .single();

  if (insertError || !inserted) {
    // Otro usuario guardó la misma variante al mismo tiempo: se usa la que quedó guardada
    const { data: existing } = await admin
      .from("lessons_cache")
      .select("id, variant, content")
      .eq("cache_key", topic.topic_key)
      .eq("kind", "lesson")
      .eq("variant", variant)
      .maybeSingle();
    if (!existing) throw new LessonError("No se pudo guardar la lección.", 500, "db");
    await markSeen(userId, existing.id);
    return build(existing as { id: number; variant: number; content: Lesson }, "cache");
  }

  await markSeen(userId, inserted.id);
  return build(inserted as { id: number; variant: number; content: Lesson }, "ai");
}
