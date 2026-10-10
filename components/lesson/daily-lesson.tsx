// components/lesson/daily-lesson.tsx
// Pide la lección a /api/lesson y la presenta como SESIÓN GUIADA (una tarjeta a la vez).
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { Lesson } from "@/lib/schemas/lesson";
import type { LessonGrade } from "@/lib/grade";
import { buildErrorExamples } from "@/lib/progress-input";
import { buildSeedCards, type ReviewItem } from "@/lib/review-input";
import { SessionFlow, type SaveStatus, type SessionMeta } from "./session-flow";

type State =
  | { status: "loading"; slow: boolean }
  | { status: "error"; message: string; code: string }
  | { status: "ready"; lesson: Lesson; meta: SessionMeta; reviews: ReviewItem[] };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-canvas text-ink">
      <div className="px-5 pt-[max(16px,env(safe-area-inset-top))]">
        <Link href="/today" aria-label="Volver a Hoy" className="flex size-11 items-center justify-center rounded-2xl bg-white">
          <X className="size-5" aria-hidden strokeWidth={2.6} />
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 text-center">{children}</div>
    </div>
  );
}

export function DailyLesson() {
  const [state, setState] = useState<State>({ status: "loading", slow: false });
  const [save, setSave] = useState<SaveStatus>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const [run, setRun] = useState(0); // al cambiar, la sesión empieza desde cero
  const startedAt = useRef(0);

  const load = useCallback(async (newVariant: boolean) => {
    setSave({ status: "idle" });
    setState({ status: "loading", slow: false });
    const slowTimer = setTimeout(
      () => setState((s) => (s.status === "loading" ? { status: "loading", slow: true } : s)),
      2500,
    );
    try {
      // Lección y repaso en paralelo; si el repaso falla, la sesión sigue sin él
      const [res, reviewRes] = await Promise.all([
        fetch(`/api/lesson${newVariant ? "?new=1" : ""}`, { cache: "no-store" }),
        fetch("/api/review?limit=8", { cache: "no-store" }).catch(() => null),
      ]);
      const body = await res.json().catch(() => ({}));
      const reviewBody = reviewRes && reviewRes.ok ? await reviewRes.json().catch(() => ({})) : {};
      if (!res.ok) {
        setState({ status: "error", message: body.error ?? "No se pudo cargar la lección.", code: body.code ?? "unknown" });
      } else {
        setState({ status: "ready", lesson: body.lesson, meta: body.meta, reviews: reviewBody.cards ?? [] });
        setAttempt(0);
        setRun((r) => r + 1);
        startedAt.current = Date.now();
      }
    } catch {
      setState({ status: "error", message: "Sin conexión. Revisa tu internet e intenta de nuevo.", code: "network" });
    } finally {
      clearTimeout(slowTimer);
    }
  }, []);

  // En desarrollo React monta dos veces: el ref evita pedir (y pagar) la lección dos veces
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void load(false);
  }, [load]);

  async function savePractice(grade: LessonGrade) {
    if (state.status !== "ready") return;
    setSave({ status: "saving" });
    const errors = buildErrorExamples(state.lesson.exercises, grade.results);
    // Lo aprendido hoy entra al repaso espaciado (solo en el primer intento)
    if (attempt === 0) {
      void fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic_key: state.meta.topic_key, cards: buildSeedCards(state.lesson, errors) }),
      }).catch(() => undefined);
    }
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_key: state.meta.topic_key,
          score: grade.score,
          minutes: (Date.now() - startedAt.current) / 60000,
          first_attempt: attempt === 0,
          errors,
        }),
      });
      const body = await res.json().catch(() => ({}));
      setSave(res.ok ? { status: "saved", completed: body.completed === true } : { status: "error" });
    } catch {
      setSave({ status: "error" });
    }
  }

  if (state.status === "loading") {
    return (
      <Shell>
        <Loader2 className="size-10 animate-spin text-brand" aria-hidden />
        <p className="font-display text-2xl font-extrabold">
          {state.slow ? "Professor Mike está preparando tu sesión…" : "Cargando tu sesión…"}
        </p>
        {state.slow && <p className="text-muted">La primera vez de cada tema tarda entre 10 y 30 segundos.</p>}
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell>
        <p className="font-display text-2xl font-extrabold">No se pudo preparar tu sesión</p>
        <p className="text-muted">{state.message}</p>
        <div className="flex w-full flex-col gap-3">
          {["no_key", "key_rejected", "provider_limit"].includes(state.code) && (
            <Link href="/settings" className="flex min-h-[52px] items-center justify-center rounded-2xl bg-brand font-bold text-white">
              Ir a Ajustes
            </Link>
          )}
          {state.code !== "quota" && (
            <button type="button" onClick={() => load(false)} className="min-h-[52px] rounded-2xl bg-ink font-bold text-white">
              Intentar de nuevo
            </button>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <SessionFlow
      key={`${state.meta.topic_key}-${state.meta.variant}-${run}`}
      lesson={state.lesson}
      reviews={attempt === 0 ? state.reviews : []}
      meta={state.meta}
      attempt={attempt}
      save={save}
      onPracticeDone={savePractice}
      onRestart={() => {
        setAttempt((a) => a + 1);
        setSave({ status: "idle" });
        setRun((r) => r + 1);
        startedAt.current = Date.now();
      }}
      onNextTopic={() => load(false)}
      onNewVersion={() => load(true)}
    />
  );
}
