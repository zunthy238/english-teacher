// lib/stories.ts
// Historia para escuchar de un tema. Se genera UNA vez por tema (y versión de prompts) y la comparten todos.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { chargeAndGetKey, generateValidated, LessonError } from "@/lib/lessons";
import { storyPrompt, storySchema } from "@/lib/prompts/story";
import { PROMPT_VERSION } from "@/lib/prompts/version";
import { validateStory } from "@/lib/story-validate";
import type { CefrLevel } from "@/lib/schemas/lesson";
import type { Story } from "@/lib/schemas/story";

export const TOPIC_KEY = /^(A1|A2|B1|B2|C1)_[a-z0-9_]{1,80}$/;

async function cachedStory(topicKey: string): Promise<Story | null> {
  const { data } = await createAdminClient()
    .from("lessons_cache")
    .select("content")
    .eq("cache_key", topicKey)
    .eq("kind", "story")
    .eq("variant", 1)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle();
  return (data?.content as Story | undefined) ?? null;
}

export async function getStory(userId: string, topicKey: string): Promise<{ story: Story; source: "cache" | "ai" }> {
  if (!TOPIC_KEY.test(topicKey)) throw new LessonError("Tema inválido.", 400, "bad_topic");

  const cached = await cachedStory(topicKey);
  if (cached) return { story: cached, source: "cache" };

  const admin = createAdminClient();
  const { data: topic } = await admin
    .from("curriculum")
    .select("topic_key, title, objectives, cefr_level")
    .eq("topic_key", topicKey)
    .maybeSingle();
  if (!topic) throw new LessonError("Ese tema no existe.", 404, "not_found");

  const level = topic.cefr_level as CefrLevel;
  const key = await chargeAndGetKey(userId);
  const story = await generateValidated(
    key,
    storyPrompt({ level, topic_key: topic.topic_key, title: topic.title, objectives: topic.objectives as string[] }),
    "story",
    storySchema,
    (raw) => validateStory(raw, { topic_key: topic.topic_key, cefr_level: level }),
  );

  const { error } = await admin.from("lessons_cache").insert({
    cache_key: topicKey,
    kind: "story",
    variant: 1,
    content: story,
    prompt_version: PROMPT_VERSION,
  });
  if (error) {
    // Otro usuario la guardó al mismo tiempo: se usa la que quedó
    const saved = await cachedStory(topicKey);
    if (saved) return { story: saved, source: "cache" };
    throw new LessonError("No se pudo guardar la historia.", 500, "db");
  }
  return { story, source: "ai" };
}
