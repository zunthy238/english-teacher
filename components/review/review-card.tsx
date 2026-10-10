// components/review/review-card.tsx
// Una tarjeta de repaso: recordar → ver la respuesta → calificar (Otra vez / Bien / Fácil).
// Recordar ANTES de ver la respuesta es lo que fija la memoria (práctica de recuperación).
"use client";

import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { previewLabels, type ReviewRating } from "@/lib/review";
import type { ReviewItem } from "@/lib/review-input";
import { speak } from "@/components/lesson/speech";

const KIND_LABEL: Record<ReviewItem["kind"], string> = {
  vocab: "Palabra",
  phrase: "Frase",
  error: "Tu error frecuente",
};

const BUTTONS: { rating: ReviewRating; label: string; style: string }[] = [
  { rating: "again", label: "Otra vez", style: "bg-[#fde2e2] text-[#7f1d1d]" },
  { rating: "good", label: "Bien", style: "bg-white text-ink" },
  { rating: "easy", label: "Fácil", style: "bg-[#dcfce7] text-[#14532d]" },
];

export function ReviewCard({ card, onDone }: { card: ReviewItem; onDone: (rating: ReviewRating) => void }) {
  const [revealed, setRevealed] = useState(false);
  const [sending, setSending] = useState(false);
  const labels = useMemo(() => previewLabels(card.fsrs, new Date()), [card.fsrs]);
  const isError = card.kind === "error";
  const question = isError ? card.extra ?? "" : card.front;
  const english = card.front;

  function reveal() {
    setRevealed(true);
    speak(english, card.kind === "vocab");
  }

  async function rate(rating: ReviewRating) {
    if (sending) return;
    setSending(true);
    try {
      await fetch("/api/review/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, rating }),
      });
    } catch {
      // Sin conexión: la tarjeta volverá a aparecer en el próximo repaso
    }
    onDone(rating);
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <button
        type="button"
        onClick={reveal}
        disabled={revealed}
        className="flex flex-1 flex-col items-center justify-center gap-5 rounded-[28px] bg-review p-7 text-center text-white"
      >
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-widest">
          {KIND_LABEL[card.kind]}
        </span>
        <span className={`font-display font-extrabold leading-tight ${isError ? "text-2xl" : "text-[34px]"}`}>
          {question}
        </span>
        {isError && !revealed && <span className="text-lg font-semibold text-white/90">¿Cuál es la forma correcta?</span>}
        {revealed ? (
          <span className="flex flex-col gap-3 pm-pop">
            {isError ? (
              <span className="rounded-2xl bg-white px-5 py-3 font-display text-2xl font-extrabold text-ink">{english}</span>
            ) : (
              <span className="text-2xl font-bold">{card.back}</span>
            )}
            {!isError && card.extra && <span className="rounded-2xl bg-white/20 px-5 py-3 text-lg italic">{card.extra}</span>}
          </span>
        ) : (
          <span className="text-base text-white/85">Piénsalo y toca para ver la respuesta</span>
        )}
      </button>

      {revealed ? (
        <div className="space-y-3 pm-rise">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => speak(english, card.kind === "vocab")}
              className="flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 font-bold text-review"
            >
              <Volume2 className="size-5" aria-hidden /> Escuchar
            </button>
          </div>
          <p className="text-center text-sm font-semibold text-muted">¿Qué tan bien la recordaste?</p>
          <div className="grid grid-cols-3 gap-2.5">
            {BUTTONS.map((b) => (
              <button
                key={b.rating}
                type="button"
                disabled={sending}
                onClick={() => rate(b.rating)}
                className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl px-2 font-extrabold transition-transform active:scale-[0.97] disabled:opacity-50 ${b.style}`}
              >
                {b.label}
                <span className="text-xs font-semibold opacity-80">{labels[b.rating]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={reveal}
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-ink text-[17px] font-extrabold text-white"
        >
          Mostrar respuesta
        </button>
      )}
    </div>
  );
}
