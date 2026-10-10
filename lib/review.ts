// lib/review.ts
// Repaso espaciado con FSRS (ts-fsrs). Funciones puras, probadas; sirven en el servidor y en el navegador.
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";

// Sin "fuzz" para que la vista previa del navegador coincida con lo que guarda el servidor.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

export type ReviewRating = "again" | "good" | "easy";
const RATING: Record<ReviewRating, Grade> = { again: Rating.Again, good: Rating.Good, easy: Rating.Easy };

export type StoredCard = Record<string, unknown>; // Card serializada (fechas como texto ISO)

// Las tarjetas nuevas se repasan por primera vez al día siguiente (lo de hoy ya se practicó).
export const FIRST_REVIEW_DELAY_HOURS = 20;

function toCard(stored: StoredCard | null, now: Date): Card {
  if (!stored) return createEmptyCard(now);
  const s = stored as Record<string, unknown>;
  return {
    ...(s as unknown as Card),
    due: new Date(String(s.due)),
    last_review: s.last_review ? new Date(String(s.last_review)) : undefined,
  };
}

function serialize(card: Card): StoredCard {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

export function newCard(now: Date): { fsrs: StoredCard; due_at: string } {
  const due = new Date(now.getTime() + FIRST_REVIEW_DELAY_HOURS * 3600_000);
  const card = { ...createEmptyCard(now), due };
  return { fsrs: serialize(card), due_at: due.toISOString() };
}

export function schedule(stored: StoredCard | null, rating: ReviewRating, now: Date) {
  const { card } = scheduler.next(toCard(stored, now), now, RATING[rating]);
  return {
    fsrs: serialize(card),
    due_at: card.due.toISOString(),
    reps: card.reps,
    lapses: card.lapses,
    last_review: now.toISOString(),
  };
}

// Texto corto de cuándo volverá la tarjeta: "10 min", "5 h", "3 días"
export function intervalLabel(from: Date, to: Date): string {
  const minutes = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} ${days === 1 ? "día" : "días"}`;
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? "mes" : "meses"}`;
}

export function previewLabels(stored: StoredCard | null, now: Date): Record<ReviewRating, string> {
  const out = {} as Record<ReviewRating, string>;
  (Object.keys(RATING) as ReviewRating[]).forEach((r) => {
    out[r] = intervalLabel(now, new Date(schedule(stored, r, now).due_at));
  });
  return out;
}

// Un error se considera superado tras 3 repasos de su tarjeta sin olvidarlo en el último
export function errorResolved(reps: number, rating: ReviewRating): boolean {
  return reps >= 3 && rating !== "again";
}
