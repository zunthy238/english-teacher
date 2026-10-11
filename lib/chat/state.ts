// lib/chat/state.ts
// Estado guardado de una conversación con Mike (por usuario, tema y versión). Funciones puras, probadas.
import type { ReviewCardLite } from "./script";

export type ChatEntry =
  | { t: "mike"; text: string; en?: string; es?: string | null; rule?: boolean }
  | { t: "user"; text: string; voice?: boolean }
  | { t: "fb"; ok: boolean; text: string; en?: string; words?: { word: string; ok: boolean }[] }
  | { t: "vocab"; items: { word: string; meaning_es: string; example: string }[] }
  | { t: "story" }
  | { t: "eval"; score: number; corrections: { wrong: string; right: string; explanation: string }[]; improved: string };

export type ChatState = {
  v: 1;
  pos: number; // paso actual del guion
  log: ChatEntry[]; // lo que se ve en el chat
  first: Record<string, boolean>; // ejercicio → acertó al primer intento
  retry: string[]; // ejercicios fallados pendientes de repasar
  recovered: string[]; // fallados que luego acertó
  review: ReviewCardLite[]; // tarjetas de repaso de esta conversación (fijas para poder retomarla)
  asked: string[]; // pasos cuya pregunta ya envió Mike
  firstGiven: Record<string, string>; // respuesta del primer intento (para registrar errores)
  retryAnnounced: boolean;
  retryAsked: string | null; // ejercicio de repaso que está en pantalla
  retryFails: Record<string, number>;
  attempt: number; // 0 = primera vez en este tema
  startedAt: number;
  finished: boolean;
  score: number | null;
  completed: boolean | null;
};

export const MAX_LOG = 400;
export const MAX_STATE_BYTES = 120_000;
const TOPIC = /^(A1|A2|B1|B2|C1)_[a-z0-9_]{1,80}$/;

export function newChatState(review: ReviewCardLite[], attempt = 0, now = Date.now()): ChatState {
  return {
    v: 1, pos: 0, log: [], first: {}, retry: [], recovered: [], review, asked: [], firstGiven: {},
    retryAnnounced: false, retryAsked: null, retryFails: {}, attempt, startedAt: now,
    finished: false, score: null, completed: null,
  };
}

export function parseChatStatePut(
  body: unknown,
): { ok: true; value: { topic_key: string; variant: number; state: ChatState } } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida." };
  const b = body as Record<string, unknown>;
  if (typeof b.topic_key !== "string" || !TOPIC.test(b.topic_key)) return { ok: false, error: "Tema inválido." };
  if (typeof b.variant !== "number" || !Number.isInteger(b.variant) || b.variant < 1 || b.variant > 50)
    return { ok: false, error: "Versión inválida." };
  const s = b.state as Partial<ChatState> | undefined;
  if (!s || s.v !== 1 || typeof s.pos !== "number" || !Array.isArray(s.log) || typeof s.first !== "object")
    return { ok: false, error: "Estado inválido." };
  if (s.log.length > MAX_LOG) return { ok: false, error: "Conversación demasiado larga." };
  if (JSON.stringify(s).length > MAX_STATE_BYTES) return { ok: false, error: "Conversación demasiado larga." };
  return { ok: true, value: { topic_key: b.topic_key, variant: b.variant, state: s as ChatState } };
}
