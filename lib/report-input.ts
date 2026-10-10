// lib/report-input.ts
// Valida un reporte de ejercicio (función pura, probada).
export const REPORT_REASONS = ["my_answer_valid", "ambiguous", "wrong_content", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportInput = {
  topic_key: string;
  variant: number | null;
  exercise_id: string;
  exercise: Record<string, unknown>;
  user_answer: string | null;
  reason: ReportReason;
  comment: string | null;
};

const TOPIC = /^(A1|A2|B1|B2|C1)_[a-z0-9_]{1,80}$/;

export function parseReportInput(body: unknown): { ok: true; value: ReportInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida." };
  const b = body as Record<string, unknown>;
  if (typeof b.topic_key !== "string" || !TOPIC.test(b.topic_key)) return { ok: false, error: "Tema inválido." };
  if (typeof b.exercise_id !== "string" || !/^[a-z0-9_-]{1,20}$/i.test(b.exercise_id))
    return { ok: false, error: "Ejercicio inválido." };
  if (typeof b.reason !== "string" || !(REPORT_REASONS as readonly string[]).includes(b.reason))
    return { ok: false, error: "Elige un motivo." };
  if (typeof b.exercise !== "object" || b.exercise === null || Array.isArray(b.exercise))
    return { ok: false, error: "Ejercicio inválido." };
  const exerciseJson = JSON.stringify(b.exercise);
  if (exerciseJson.length > 4000) return { ok: false, error: "Ejercicio demasiado grande." };
  const comment = typeof b.comment === "string" ? b.comment.trim().slice(0, 500) : "";
  const answer = typeof b.user_answer === "string" ? b.user_answer.trim().slice(0, 300) : "";
  const variant = typeof b.variant === "number" && Number.isInteger(b.variant) ? b.variant : null;
  return {
    ok: true,
    value: {
      topic_key: b.topic_key,
      variant,
      exercise_id: b.exercise_id,
      exercise: JSON.parse(exerciseJson),
      user_answer: answer || null,
      reason: b.reason as ReportReason,
      comment: comment || null,
    },
  };
}
