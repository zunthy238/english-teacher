// lib/placement/engine.ts
// Motor de la prueba de nivel: test adaptativo computarizado (CAT) con Teoría de Respuesta al Ítem.
// - Modelo 3PL simplificado: cada nivel tiene una dificultad (A1=-2 … C1=+2) y hay 20% de acierto por adivinar.
// - Estimación de habilidad (theta) por EAP sobre una rejilla: estable desde la 1ª respuesta.
// - Cada pregunta nueva es la de dificultad más cercana a tu theta actual, rotando habilidades.
// Funciones puras: el navegador las usa para adaptar la prueba y el servidor las repite para guardar el resultado.
import type { CefrLevel } from "../schemas/lesson";
import { BANK_BY_ID, correctOption, PLACEMENT_BANK, type PlacementItem, type Skill } from "./bank";

export const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];
export const TEST_LENGTH = 15;
export const SKILL_ORDER: Skill[] = ["grammar", "vocab", "listening", "reading"];

const DIFFICULTY: Record<CefrLevel, number> = { A1: -2, A2: -1, B1: 0, B2: 1, C1: 2 };
const DISCRIMINATION = 1.7; // qué tan bien separa una pregunta a quien sabe de quien no
const GUESS = 0.2; // probabilidad de acertar adivinando (4 opciones, con "No lo sé" disponible)
const PRIOR_MEAN = -0.6; // arranque suave: la 1ª pregunta es A2
const PRIOR_SD = 1.6;
const GRID = Array.from({ length: 161 }, (_, i) => -4 + i * 0.05);

export type Answer = { id: string; choice: string | null }; // null = "No lo sé"
export type Response = { item: PlacementItem; correct: boolean };

export function pCorrect(theta: number, level: CefrLevel) {
  return GUESS + (1 - GUESS) / (1 + Math.exp(-DISCRIMINATION * (theta - DIFFICULTY[level])));
}

// Estimación EAP (media posterior) y su error estándar
export function estimate(responses: Response[]): { theta: number; se: number } {
  let sum = 0;
  let mean = 0;
  const post = GRID.map((t) => {
    let w = Math.exp(-0.5 * ((t - PRIOR_MEAN) / PRIOR_SD) ** 2);
    for (const r of responses) {
      const p = pCorrect(t, r.item.level);
      w *= r.correct ? p : 1 - p;
    }
    return w;
  });
  post.forEach((w, i) => {
    sum += w;
    mean += w * GRID[i];
  });
  mean /= sum;
  const variance = post.reduce((acc, w, i) => acc + w * (GRID[i] - mean) ** 2, 0) / sum;
  return { theta: mean, se: Math.sqrt(variance) };
}

// Theta → nivel. Quien domina B1 pero no B2 queda alrededor de 0.5 → B1.
export function levelFor(theta: number): CefrLevel {
  if (theta < -1) return "A1";
  if (theta < 0) return "A2";
  if (theta < 1) return "B1";
  if (theta < 2) return "B2";
  return "C1";
}

export function nextItem(responses: Response[]): PlacementItem | null {
  if (responses.length >= TEST_LENGTH) return null;
  const used = new Set(responses.map((r) => r.item.id));
  const { theta } = estimate(responses);
  const skill = SKILL_ORDER[responses.length % SKILL_ORDER.length];
  const pool = PLACEMENT_BANK.filter((i) => !used.has(i.id));
  const sameSkill = pool.filter((i) => i.skill === skill);
  const candidates = sameSkill.length ? sameSkill : pool;
  if (!candidates.length) return null;
  // La más informativa: dificultad más cercana a theta. En empate, la de nivel más bajo (más amable).
  return candidates.reduce((best, i) =>
    Math.abs(DIFFICULTY[i.level] - theta) < Math.abs(DIFFICULTY[best.level] - theta) ? i : best,
  );
}

export function toResponses(answers: Answer[]): Response[] {
  return answers.map((a) => {
    const item = BANK_BY_ID.get(a.id)!;
    return { item, correct: a.choice !== null && a.choice === correctOption(item) };
  });
}

export type SkillResult = { level: CefrLevel; pct: number; answered: number; correct: number };
export type PlacementResult = {
  level: CefrLevel;
  theta: number;
  se: number;
  skills: Record<Skill, SkillResult>;
  focus: Skill | null; // la habilidad más débil (a reforzar)
  correct: number;
  total: number;
};

const toPct = (theta: number) => Math.max(5, Math.min(100, Math.round(((theta + 2.5) / 5) * 100)));

export function scorePlacement(answers: Answer[]): PlacementResult {
  const responses = toResponses(answers);
  const { theta, se } = estimate(responses);
  const skills = {} as Record<Skill, SkillResult>;
  for (const s of SKILL_ORDER) {
    const rs = responses.filter((r) => r.item.skill === s);
    // Por habilidad hay pocas preguntas: se combina con la estimación global para no exagerar
    const own = rs.length ? estimate(rs).theta : theta;
    const blended = rs.length ? (own * rs.length + theta * 2) / (rs.length + 2) : theta;
    skills[s] = { level: levelFor(blended), pct: toPct(blended), answered: rs.length, correct: rs.filter((r) => r.correct).length };
  }
  const ranked = SKILL_ORDER.filter((s) => skills[s].answered >= 2).sort((a, b) => skills[a].pct - skills[b].pct);
  const focus = ranked.length >= 2 && skills[ranked[0]].pct < skills[ranked[ranked.length - 1]].pct ? ranked[0] : null;
  return {
    level: levelFor(theta),
    theta: Math.round(theta * 100) / 100,
    se: Math.round(se * 100) / 100,
    skills,
    focus,
    correct: responses.filter((r) => r.correct).length,
    total: responses.length,
  };
}

// Puede empezar en su nivel o uno más abajo (nunca más arriba de lo que mostró la prueba)
export function allowedStartLevels(level: CefrLevel): CefrLevel[] {
  const i = LEVELS.indexOf(level);
  return i > 0 ? [level, LEVELS[i - 1]] : [level];
}

export function parsePlacementInput(
  body: unknown,
): { ok: true; value: { answers: Answer[]; start_level: CefrLevel } } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida." };
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.answers) || b.answers.length < 5 || b.answers.length > TEST_LENGTH) {
    return { ok: false, error: "La prueba está incompleta." };
  }
  const seen = new Set<string>();
  const answers: Answer[] = [];
  for (const raw of b.answers) {
    if (typeof raw !== "object" || raw === null) return { ok: false, error: "Respuesta inválida." };
    const { id, choice } = raw as Record<string, unknown>;
    const item = typeof id === "string" ? BANK_BY_ID.get(id) : undefined;
    if (!item || seen.has(item.id)) return { ok: false, error: "Pregunta desconocida o repetida." };
    if (choice !== null && (typeof choice !== "string" || !item.options.includes(choice))) {
      return { ok: false, error: "Respuesta inválida." };
    }
    seen.add(item.id);
    answers.push({ id: item.id, choice: choice as string | null });
  }
  if (typeof b.start_level !== "string" || !LEVELS.includes(b.start_level as CefrLevel)) {
    return { ok: false, error: "Nivel inválido." };
  }
  return { ok: true, value: { answers, start_level: b.start_level as CefrLevel } };
}
