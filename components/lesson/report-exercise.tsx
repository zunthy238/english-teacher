// components/lesson/report-exercise.tsx
// "Reportar este ejercicio": el estudiante marca un ejercicio con error para revisarlo y mejorar la app.
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Flag, Loader2, X } from "lucide-react";
import type { ClosedExercise } from "@/lib/schemas/lesson";
import type { ReportReason } from "@/lib/report-input";

const REASONS: { id: ReportReason; label: string }[] = [
  { id: "my_answer_valid", label: "Mi respuesta también es correcta" },
  { id: "ambiguous", label: "Hay más de una respuesta posible" },
  { id: "wrong_content", label: "El ejercicio o la respuesta tienen un error" },
  { id: "other", label: "Otro problema" },
];

export function ReportExercise({
  exercise,
  userAnswer,
  topicKey,
  variant,
}: {
  exercise: ClosedExercise;
  userAnswer: string;
  topicKey: string;
  variant: number;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send() {
    if (!reason) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_key: topicKey,
          variant,
          exercise_id: exercise.id,
          exercise,
          user_answer: userAnswer,
          reason,
          comment,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
      if (res.ok) setTimeout(() => setOpen(false), 1400);
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent" && !open) {
    return <p className="text-center text-sm font-semibold opacity-80">Gracias, reporte enviado.</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex min-h-[44px] items-center gap-1.5 text-sm font-bold underline-offset-4 opacity-80 hover:underline"
      >
        <Flag className="size-4" aria-hidden /> Reportar este ejercicio
      </button>

      {/* Portal: el modal se monta en <body> para no quedar atrapado dentro de las tarjetas animadas */}
      {open && createPortal(
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <div className="w-full max-w-md space-y-4 rounded-t-[28px] bg-white p-6 pb-[max(24px,env(safe-area-inset-bottom))] text-ink pm-rise sm:rounded-[28px]">
            <div className="flex items-center justify-between">
              <h2 id="report-title" className="font-display text-2xl font-extrabold">¿Qué está mal?</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-2xl bg-canvas">
                <X className="size-5" aria-hidden strokeWidth={2.6} />
              </button>
            </div>

            {status === "sent" ? (
              <p className="rounded-2xl bg-[#dcfce7] px-4 py-4 font-bold text-[#14532d]">¡Gracias! Lo revisaremos para mejorar Professor Mike.</p>
            ) : (
              <>
                <div className="flex flex-col gap-2.5">
                  {REASONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      aria-pressed={reason === r.id}
                      onClick={() => setReason(r.id)}
                      className={`min-h-[52px] rounded-2xl border-2 px-4 text-left font-bold transition-colors ${
                        reason === r.id ? "border-brand bg-brand/10" : "border-line bg-white"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="report-comment" className="text-sm font-bold text-muted">
                    Comentario (opcional)
                  </label>
                  <textarea
                    id="report-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="Ej.: 'doesn't go' también es correcto"
                    className="w-full rounded-2xl border-2 border-line px-4 py-3 text-base outline-none focus:border-brand"
                  />
                </div>
                {status === "error" && <p role="alert" className="text-sm font-semibold text-[#b91c1c]">No se pudo enviar. Intenta de nuevo.</p>}
                <button
                  type="button"
                  onClick={send}
                  disabled={!reason || status === "sending"}
                  className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[17px] font-extrabold text-white disabled:opacity-40"
                >
                  {status === "sending" && <Loader2 className="size-5 animate-spin" aria-hidden />}
                  Enviar reporte
                </button>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
