// components/lesson/daily-lesson.tsx
// Pantalla Hoy: pide la lección a /api/lesson y la muestra con sus ejercicios.
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Database } from "lucide-react";
import type { Lesson } from "@/lib/schemas/lesson";
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

export function DailyLesson() {
  const [state, setState] = useState<State>({ status: "loading", slow: false });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (newVariant: boolean) => {
    setBusy(true);
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
        if (newVariant) window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setState({ status: "error", message: "Sin conexión. Revisa tu internet e intenta de nuevo.", code: "network" });
    } finally {
      clearTimeout(slowTimer);
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

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
      <ExercisesForm key={`${meta.topic_key}-${meta.variant}`} exercises={lesson.exercises} />

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
