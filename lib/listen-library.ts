// lib/listen-library.ts
// Biblioteca "Historias": qué historias puede escuchar el usuario y si la escucha es su punto débil (funciones puras, probadas).
import type { Story } from "./schemas/story";

export type LibraryItem = {
  topic_key: string;
  title: string; // título de la historia
  topic_title: string; // título del tema del currículo
  emoji: string;
  level: string;
  position: number | null;
  isNew: boolean; // historia del tema actual
};

export function buildLibrary(input: {
  stories: { cache_key: string; content: Story }[];
  topics: { topic_key: string; title: string; position: number }[]; // currículo del nivel actual
  completed: string[];
  nextTopic: string | null;
}): LibraryItem[] {
  const allowed = new Set([...input.completed, ...(input.nextTopic ? [input.nextTopic] : [])]);
  const byKey = new Map(input.topics.map((t) => [t.topic_key, t]));
  return input.stories
    .filter((s) => allowed.has(s.cache_key))
    .map((s) => {
      const t = byKey.get(s.cache_key);
      return {
        topic_key: s.cache_key,
        title: s.content.title,
        topic_title: t?.title ?? s.cache_key.replace(/^[A-C][12]_/, "").replace(/_/g, " "),
        emoji: s.content.scene_emoji,
        level: s.cache_key.slice(0, 2),
        position: t?.position ?? null,
        isNew: s.cache_key === input.nextTopic,
      };
    })
    .sort((a, b) => Number(b.isNew) - Number(a.isNew) || (b.position ?? -1) - (a.position ?? -1) || a.topic_key.localeCompare(b.topic_key));
}

// La escucha es el punto a reforzar si en la última prueba de nivel quedó como la habilidad más baja
export function listeningIsWeak(skills: Record<string, { pct?: number }> | null | undefined): boolean {
  if (!skills?.listening?.pct) return false;
  const others = Object.entries(skills).filter(([k, v]) => k !== "listening" && typeof v?.pct === "number");
  return others.length > 0 && others.every(([, v]) => (v.pct as number) > (skills.listening.pct as number));
}
