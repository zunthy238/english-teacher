// components/settings/goal-picker.tsx
// Meta diaria: una meta alcanzable mantiene el hábito mejor que una ambiciosa que no se cumple.
"use client";

import { useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";
import { GOAL_OPTIONS } from "@/lib/goal";

export function GoalPicker() {
  const [value, setValue] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setValue(typeof b.daily_minutes === "number" ? b.daily_minutes : 30))
      .catch(() => setValue(30));
  }, []);

  async function choose(minutes: number) {
    const previous = value;
    setValue(minutes);
    setStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_minutes: minutes }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch {
      setValue(previous);
      setStatus("error");
    }
  }

  return (
    <section className="space-y-3 rounded-[24px] bg-white p-5" aria-labelledby="goal-title">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <Target className="size-5" aria-hidden strokeWidth={2.2} />
        </span>
        <div>
          <h2 id="goal-title" className="font-bold">Meta diaria</h2>
          <p className="text-sm text-muted">Una sesión completa dura unos 20 minutos.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Minutos por día">
        {GOAL_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={value === m}
            disabled={value === null}
            onClick={() => choose(m)}
            className={`min-h-[52px] rounded-2xl border-2 font-extrabold transition-colors ${
              value === m ? "border-brand bg-brand text-white" : "border-line bg-white text-ink"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>
      <p className="min-h-5 text-sm" role="status">
        {status === "saved" && <span className="font-semibold text-[#15803d]">Meta guardada.</span>}
        {status === "error" && <span className="font-semibold text-[#b91c1c]">No se pudo guardar. Intenta de nuevo.</span>}
      </p>
    </section>
  );
}
