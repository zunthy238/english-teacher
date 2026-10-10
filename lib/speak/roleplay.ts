// lib/speak/roleplay.ts
// Validación de la conversación y de lo que devuelve la IA (funciones puras, probadas).
import { SCENARIO_BY_ID, TURNS, type Scenario } from "./scenarios";
import { toSnakeCase } from "../lesson-validate";
import { sameAnswer } from "../grade";

export type ChatMessage = { role: "mike" | "user"; text: string };
export type RoleplayReply = { reply: string; hint: string | null };
export type Correction = { wrong: string; right: string; why_es: string; error_type: string };
export type Feedback = {
  understood: number;
  turns: number;
  corrections: Correction[];
  golden_phrase: { en: string; es: string };
  praise_es: string;
};

const MAX_TEXT = 400;
const clean = (s: string) => s.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();

export function parseRoleplayInput(
  body: unknown,
  opts: { requireComplete?: boolean } = {},
):
  | { ok: true; value: { scenario: Scenario; messages: ChatMessage[]; minutes: number } }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida." };
  const b = body as Record<string, unknown>;
  const scenario = typeof b.scenario_id === "string" ? SCENARIO_BY_ID.get(b.scenario_id) : undefined;
  if (!scenario) return { ok: false, error: "Escenario desconocido." };
  if (!Array.isArray(b.messages) || b.messages.length < 2 || b.messages.length > TURNS * 2 + 1) {
    return { ok: false, error: "Conversación inválida." };
  }
  const messages: ChatMessage[] = [];
  for (const raw of b.messages) {
    if (typeof raw !== "object" || raw === null) return { ok: false, error: "Mensaje inválido." };
    const m = raw as Record<string, unknown>;
    if ((m.role !== "mike" && m.role !== "user") || typeof m.text !== "string") return { ok: false, error: "Mensaje inválido." };
    const text = clean(m.text).slice(0, MAX_TEXT);
    if (!text) return { ok: false, error: "Mensaje vacío." };
    messages.push({ role: m.role, text });
  }
  // Empieza Mike y se alternan los turnos
  if (messages.some((m, i) => m.role !== (i % 2 === 0 ? "mike" : "user"))) return { ok: false, error: "Turnos desordenados." };
  const userTurns = messages.filter((m) => m.role === "user").length;
  if (userTurns > TURNS) return { ok: false, error: "La conversación ya terminó." };
  if (!opts.requireComplete && messages.at(-1)?.role !== "user") return { ok: false, error: "Falta tu respuesta." };
  if (opts.requireComplete && userTurns < 2) return { ok: false, error: "Habla un poco más para darte retroalimentación." };
  const minutes = typeof b.minutes === "number" && Number.isFinite(b.minutes) ? Math.min(60, Math.max(0, Math.round(b.minutes))) : 0;
  return { ok: true, value: { scenario, messages, minutes } };
}

export function userTurns(messages: ChatMessage[]) {
  return messages.filter((m) => m.role === "user").length;
}

type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };
const str = (v: unknown) => (typeof v === "string" ? clean(v) : "");

export function validateReply(raw: unknown, closing: boolean): Result<RoleplayReply> {
  if (typeof raw !== "object" || raw === null) return { ok: false, errors: ["no es un objeto"] };
  const r = raw as Record<string, unknown>;
  const reply = str(r.reply);
  if (!reply) return { ok: false, errors: ["reply vacío"] };
  if (reply.length > 400) return { ok: false, errors: ["reply demasiado largo"] };
  const hint = closing ? null : str(r.hint).slice(0, 200) || null;
  return { ok: true, value: { reply, hint } };
}

export function validateFeedback(raw: unknown, turns: number): Result<Feedback> {
  if (typeof raw !== "object" || raw === null) return { ok: false, errors: ["no es un objeto"] };
  const r = raw as Record<string, unknown>;
  const corrections: Correction[] = (Array.isArray(r.corrections) ? r.corrections : [])
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({ wrong: str(c.wrong), right: str(c.right), why_es: str(c.why_es), error_type: toSnakeCase(str(c.error_type)) }))
    // Fuera: correcciones vacías o que solo cambian contracciones/puntuación
    .filter((c) => c.wrong && c.right && c.error_type && !sameAnswer(c.wrong, c.right))
    .slice(0, 3);
  const gp = typeof r.golden_phrase === "object" && r.golden_phrase !== null ? (r.golden_phrase as Record<string, unknown>) : {};
  const golden_phrase = { en: str(gp.en), es: str(gp.es) };
  if (!golden_phrase.en || !golden_phrase.es) return { ok: false, errors: ["falta golden_phrase"] };
  const understoodRaw = typeof r.understood === "number" && Number.isFinite(r.understood) ? Math.round(r.understood) : turns;
  return {
    ok: true,
    value: {
      understood: Math.max(0, Math.min(turns, understoodRaw)),
      turns,
      corrections,
      golden_phrase,
      praise_es: str(r.praise_es).slice(0, 200) || "¡Buen trabajo hablando en inglés!",
    },
  };
}
