// components/lesson/daily-lesson.tsx
// Pantalla Hoy: pide la lección a /api/lesson y la muestra con sus ejercicios.
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, RefreshCw, Sparkles, Database } from "lucide-react";
import type { Lesson } from "@/lib/schemas/lesson";
import type { LessonGrade } from "@/lib/grade";
import { buildErrorExamples } from "@/lib/progress-input";
import { LessonContent } from "./lesson-content";
import { ExercisesForm } from "./exercises-form";

type Meta = {
  topic_key: string;
  title: string;
  position: number;
  total: number;
  variant: number;
  source: "cache" | "ai";
};
type State =
  | { status: "loading"; slow: boolean }
  | { status: "error"; message: string; code: string }
  | { status: "ready"; lesson: Lesson; meta: Meta };
type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; completed: boolean; score: number }
  | { status: "error" };

export function DailyLesson() {
  const [state, setState] = useState<State>({ status: "loading", slow: false });
  const [busy, setBusy] = useState(false);
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const startedAt = useRef(0);

  const load = useCallback(async (newVariant: boolean) => {
    setBusy(true);
    setSave({ status: "idle" });
    setState({ status: "loading", slow: false });
    // Si tarda, probablemente la IA está generando: se avisa al estudiante
    const slowTimer = setTimeout(() => setState((s) => (s.status === "loading" ? { status: "loading", slow: true } : s)), 2500);
    try {
      const res = await fetch(`/api/lesson${newVariant ? "?new=1" : ""}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ status: "error", message: body.error ?? "No se pudo cargar la lección.", code: body.code ?? "unknown" });
      } else {
        setState({ status: "ready", lesson: body.lesson, meta: body.meta });
        startedAt.current = Date.now();
        if (newVariant) window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setState({ status: "error", message: "Sin conexión. Revisa tu internet e intenta de nuevo.", code: "network" });
    } finally {
      clearTimeout(slowTimer);
      setBusy(false);
    }
  }, []);

  // En desarrollo React monta los componentes dos veces: el ref evita pedir (y pagar) la lección dos veces
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void load(false);
  }, [load]);

  // Guarda el resultado al calificar: sesión, errores (solo 1er intento) y tema completado si saca 80+
  async function saveResult(grade: LessonGrade, attempt: number) {
    if (state.status !== "ready") return;
    setSave({ status: "saving" });
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_key: state.meta.topic_key,
          score: grade.score,
          minutes: (Date.now() - startedAt.current) / 60000,
          first_attempt: attempt === 0,
          errors: buildErrorExamples(state.lesson.exercises, grade.results),
        }),
      });
      const body = await res.json().catch(() => ({}));
      setSave(res.ok ? { status: "saved", completed: body.completed === true, score: grade.score } : { status: "error" });
    } catch {
      setSave({ status: "error" });
    }
  }

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="size-8 animate-spin text-blue-600" aria-hidden />
        <p className="font-medium">{state.slow ? "Professor Mike está preparando tu lección…" : "Cargando tu lección…"}</p>
        {state.slow && <p className="text-sm text-zinc-500">La primera vez de cada tema tarda entre 10 y 30 segundos.</p>}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <p className="font-semibold">No se pudo preparar tu lección</p>
        <p>{state.message}</p>
        <div className="flex flex-wrap gap-2">
          {(state.code === "no_key" || state.code === "key_rejected" || state.code === "provider_limit") && (
            <Link href="/settings" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Ir a Ajustes
            </Link>
          )}
          {state.code !== "quota" && (
            <button
              type="button"
              onClick={() => load(false)}
              className="rounded-xl border border-current px-4 py-2.5 text-sm font-semibold"
            >
              Intentar de nuevo
            </button>
          )}
        </div>
      </div>
    );
  }

  const { lesson, meta } = state;
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-zinc-500">
          Tema {meta.position} de {meta.total} · versión {meta.variant}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            meta.source === "ai"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200"
              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {meta.source === "ai" ? <Sparkles className="size-3.5" aria-hidden /> : <Database className="size-3.5" aria-hidden />}
          {meta.source === "ai" ? "Nueva, generada por IA" : "Desde caché · $0"}
        </span>
      </div>

      <LessonContent lesson={lesson} />
      <ExercisesForm key={`${meta.topic_key}-${meta.variant}`} exercises={lesson.exercises} onGraded={saveResult} topicKey={meta.topic_key} />

      {save.status === "saving" && (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Guardando tu progreso…
        </p>
      )}
      {save.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          No se pudo guardar tu progreso. Revisa tu conexión y vuelve a calificar.
        </p>
      )}
      {save.status === "saved" &&
        (save.completed ? (
          <div className="space-y-3 rounded-2xl bg-green-50 p-5 text-green-900 dark:bg-green-950 dark:text-green-100">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-5" aria-hidden /> ¡Tema completado! Progreso guardado.
            </p>
            {meta.position < meta.total && (
              <button
                type="button"
                onClick={() => load(false)}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                Siguiente tema <ArrowRight className="size-4" aria-hidden />
              </button>
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Progreso guardado. Necesitas 80 o más para avanzar al siguiente tema: repasa y vuelve a intentarlo.
          </p>
        ))}

      <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => load(true)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <RefreshCw className="size-4" aria-hidden />
          Otra versión de este tema
        </button>
        <p className="mt-2 text-xs text-zinc-500">Hay hasta 3 versiones por tema. Si ya existe en caché, no gasta tu key.</p>
      </div>
    </div>
  );
}
