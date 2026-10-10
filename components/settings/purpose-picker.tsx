"use client";
// components/settings/purpose-picker.tsx
// Ajustes → "¿Para qué quieres el inglés?" (varias opciones) y, si es Trabajo, la profesión.
import { useEffect, useState } from "react";
import { Check, Compass } from "lucide-react";
import { PURPOSE_INFO, PURPOSES, type Purpose } from "@/lib/speak/scenarios";

type Status = "idle" | "saving" | "saved" | "error";

export function PurposePicker() {
  const [goals, setGoals] = useState<Purpose[] | null>(null);
  const [job, setJob] = useState("");
  const [savedJob, setSavedJob] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p) return;
        setGoals(p.goals ?? ["daily"]);
        setJob(p.job_title ?? "");
        setSavedJob(p.job_title ?? "");
      })
      .catch(() => setGoals(["daily"]));
  }, []);

  async function patch(body: Record<string, unknown>) {
    setStatus("saving");
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setStatus("saved");
      return true;
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "No se pudo guardar.");
      return false;
    }
  }

  async function toggle(p: Purpose) {
    if (!goals) return;
    const next = goals.includes(p) ? goals.filter((g) => g !== p) : [...goals, p];
    if (next.length === 0) {
      setMessage("Deja al menos una opción.");
      return;
    }
    const previous = goals;
    setGoals(next);
    if (!(await patch({ goals: next }))) setGoals(previous);
  }

  async function saveJob() {
    if (await patch({ job_title: job.trim() || null })) setSavedJob(job.trim());
  }

  return (
    <section className="space-y-3 rounded-[24px] bg-white p-5" aria-labelledby="purpose-title">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-speak/15 text-speak">
          <Compass className="size-5" aria-hidden strokeWidth={2.2} />
        </span>
        <div>
          <h2 id="purpose-title" className="font-bold">¿Para qué quieres el inglés?</h2>
          <p className="text-sm text-muted">Elige una o varias. Cambia tus conversaciones en Hablar.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Propósitos">
        {PURPOSES.map((p) => {
          const on = goals?.includes(p) ?? false;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              disabled={goals === null}
              onClick={() => toggle(p)}
              className={`relative rounded-2xl border-2 px-3 py-3 text-left transition-colors ${on ? "border-speak bg-speak/10" : "border-line bg-white"}`}
            >
              {on && <Check className="absolute right-2.5 top-2.5 size-4 text-speak" aria-hidden strokeWidth={3} />}
              <span className="block text-xl" aria-hidden>{PURPOSE_INFO[p].emoji}</span>
              <span className="block font-extrabold">{PURPOSE_INFO[p].label}</span>
              <span className="block text-xs text-muted">{PURPOSE_INFO[p].desc}</span>
            </button>
          );
        })}
      </div>
      {goals?.includes("work") && (
        <div className="space-y-2 pt-1">
          <label htmlFor="job" className="text-sm font-bold">Tu profesión o el trabajo que buscas</label>
          <div className="flex gap-2">
            <input
              id="job"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              maxLength={60}
              placeholder="Ej.: Power Apps Developer, Accountant, Nurse"
              className="min-h-[48px] flex-1 rounded-xl border-2 border-line px-3 outline-none focus:border-speak"
            />
            <button
              type="button"
              onClick={saveJob}
              disabled={job.trim() === savedJob || status === "saving"}
              className="rounded-xl bg-ink px-4 font-bold text-white disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
          <p className="text-xs text-muted">Mike lo usa en entrevistas y reuniones. Mejor en inglés.</p>
        </div>
      )}
      <p className="min-h-5 text-sm" aria-live="polite">
        {status === "saved" && <span className="text-[#15803d]">Guardado ✓</span>}
        {(status === "error" || message) && <span className="text-[#dc2626]">{message}</span>}
      </p>
    </section>
  );
}
