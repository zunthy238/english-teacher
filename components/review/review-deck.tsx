// components/review/review-deck.tsx
// Pantalla Repaso: todas las tarjetas que vencen hoy, una a la vez.
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Layers, Loader2 } from "lucide-react";
import type { ReviewItem } from "@/lib/review-input";
import { ReviewCard } from "./review-card";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; cards: ReviewItem[]; index: number; total: number };

export function ReviewDeck() {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/review?limit=20", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) return setState({ status: "error" });
      setState({ status: "ready", cards: body.cards, index: 0, total: body.due_count });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void load();
  }, [load]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-review" aria-hidden />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="space-y-4 rounded-[24px] bg-white p-6 text-center">
        <p className="font-bold">No se pudo cargar el repaso.</p>
        <button type="button" onClick={load} className="min-h-[48px] rounded-2xl bg-ink px-5 font-bold text-white">
          Intentar de nuevo
        </button>
      </div>
    );
  }

  const { cards, index } = state;
  const done = index >= cards.length;

  return (
    <div className="flex min-h-[calc(100dvh-180px)] flex-col gap-5 pm-rise">
      <header>
        <p className="text-sm font-extrabold uppercase tracking-widest text-review">Repaso</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">
          {done ? "¡Repaso completo!" : `${cards.length - index} por repasar`}
        </h1>
      </header>

      {cards.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[28px] bg-white p-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-review/15 text-review">
            <Layers className="size-8" aria-hidden />
          </span>
          <p className="font-display text-xl font-bold">No tienes tarjetas pendientes</p>
          <p className="text-muted">
            Cada sesión agrega las palabras, frases y errores que aprendes. Vuelven aquí justo cuando estás por olvidarlos.
          </p>
          <Link href="/lesson" className="min-h-[52px] rounded-2xl bg-ink px-6 py-3.5 font-bold text-white">
            Hacer la sesión de hoy
          </Link>
        </div>
      ) : done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[28px] bg-ink p-8 text-center text-white pm-pop">
          <CheckCircle2 className="size-16 text-[#4ade80]" aria-hidden />
          <p className="font-display text-2xl font-extrabold">{cards.length} tarjetas repasadas</p>
          <p className="text-[#b9bce6]">Lo que recordaste volverá más adelante; lo que olvidaste, pronto.</p>
          <Link href="/today" className="min-h-[52px] rounded-2xl bg-brand-soft px-6 py-3.5 font-extrabold text-ink">
            Volver a Hoy
          </Link>
        </div>
      ) : (
        <>
          <div className="h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-review transition-all" style={{ width: `${(index / cards.length) * 100}%` }} />
          </div>
          <ReviewCard
            key={cards[index].id}
            card={cards[index]}
            onDone={() => setState({ ...state, index: index + 1 })}
          />
        </>
      )}
    </div>
  );
}
