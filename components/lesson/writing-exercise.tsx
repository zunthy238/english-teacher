// components/lesson/writing-exercise.tsx
// Ejercicio de escritura corregido por la IA: correcciones, versión mejorada, puntaje y siguiente foco.
"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, PenLine, Sparkles } from "lucide-react";
import type { Evaluation } from "@/lib/evaluate-validate";
import { SpeakButton } from "./speak-button";

export function WritingExercise({ topicKey, task }: { topicKey: string; task: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);

  const words = text.trim().split(/\s+/).filter(Boolean).length;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic_key: topicKey, task, text }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError({ message: body.error ?? "No se pudo corregir.", code: body.code ?? "unknown" });
      else setResult(body.evaluation as Evaluation);
    } catch {
      setError({ message: "Sin conexión. Intenta de nuevo.", code: "network" });
    } finally {
      setBusy(false);
    }
  }

  const good = (result?.score ?? 0) >= 80;

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <PenLine className="size-4" aria-hidden /> Escritura · corrección con IA
      </div>
      <p>{task}</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy || result !== null}
        rows={5}
        maxLength={2000}
        placeholder="Write in English here…"
        spellCheck={false}
        autoCorrect="off"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-950"
      />

      {result === null ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">{words} palabras · usa 1 solicitud</span>
          <button
            type="button"
            onClick={submit}
            disabled={busy || words < 3}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            {busy ? "Professor Mike está corrigiendo…" : "Corregir con IA"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className={`rounded-xl p-4 ${
              good
                ? "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100"
                : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
            }`}
          >
            <p className="text-2xl font-bold">
              {result.score}
              <span className="text-base font-medium">/100</span>
            </p>
            {result.strengths.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-sm">
                {result.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </div>

          {result.corrections.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Correcciones</p>
              <ul className="space-y-2">
                {result.corrections.map((c, i) => (
                  <li key={i} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="text-red-600 line-through dark:text-red-400">{c.wrong}</span>
                      <span className="text-zinc-400">→</span>
                      <span className="font-medium text-green-700 dark:text-green-400">{c.right}</span>
                      <SpeakButton text={c.right} label={`Escuchar: ${c.right}`} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{c.explanation}</p>
                    <code className="mt-1 inline-block text-xs text-zinc-500">{c.error_type}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm font-medium text-green-700 dark:text-green-400">✓ Sin errores. ¡Excelente!</p>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Versión mejorada</p>
            <div className="flex items-start gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
              <SpeakButton text={result.improved_version} label="Escuchar la versión mejorada" />
              <p className="whitespace-pre-line pt-1">{result.improved_version}</p>
            </div>
          </div>

          <p className="text-sm">
            <span className="font-semibold">Tu siguiente foco: </span>
            {result.next_focus}
          </p>

          <button
            type="button"
            onClick={() => {
              setResult(null);
              setText("");
            }}
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Escribir otro texto
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <span>{error.message}</span>
          {["no_key", "key_rejected", "provider_limit"].includes(error.code) && (
            <Link href="/settings" className="font-semibold underline">
              Ir a Ajustes
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
