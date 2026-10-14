// components/progress/progress-view.tsx
// Progreso 2.0: nivel y camino, "Ya puedo…", semana, tiempo por actividad, repaso y errores frecuentes.
import Link from "next/link";
import { ArrowRight, CheckCircle2, Flame, Layers, Clock, BookOpen, Trophy } from "lucide-react";
import type { ProgressSummary } from "@/lib/progress-summary";
import { ACTIVITY_LABEL, type ProgressV2 } from "@/lib/progress-v2";

const sectionTitle = "mb-3 text-xs font-extrabold uppercase tracking-widest text-muted";
const ACTIVITY_COLOR = { lessons: "bg-brand", writing: "bg-write", voice: "bg-speak" } as const;
const LEVEL_COLOR: Record<string, string> = { A1: "#4ade80", A2: "#38bdf8", B1: "#8b7cff", B2: "#f87171", C1: "#ffc93c" };

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[20px] bg-white p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted">
        {icon} {label}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ProgressView({ p, v2, review }: { p: ProgressSummary; v2: ProgressV2; review: { due: number; total: number } }) {
  const weekTotal = p.week.reduce((sum, d) => sum + d.minutes, 0);
  const pct = v2.topicsTotal ? Math.round((v2.topicsDone / v2.topicsTotal) * 100) : 0;
  const maxActivity = Math.max(1, ...v2.activity.map((a) => a.minutes));
  const maxErrors = Math.max(1, ...p.top_errors.map((e) => e.count));

  return (
    <div className="space-y-6">
      <header className="space-y-1 pm-rise">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">Progreso</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Tu avance real</h1>
      </header>

      {/* Nivel */}
      <section className="space-y-4 rounded-[28px] bg-ink p-6 text-white pm-rise">
        <div className="flex items-center gap-4">
          <span
            className="flex size-20 shrink-0 flex-col items-center justify-center rounded-full text-ink"
            style={{ background: LEVEL_COLOR[v2.level] }}
          >
            <span className="font-display text-3xl font-black leading-none">{v2.level}</span>
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#b9bce6]">Tu nivel</p>
            <p className="font-display text-xl font-extrabold leading-tight">
              {v2.startLevel === v2.level ? `Empezaste en ${v2.startLevel}` : `Empezaste en ${v2.startLevel} → hoy ${v2.level} 🚀`}
            </p>
            <p className="mt-0.5 text-sm text-[#b9bce6]">
              {v2.topicsDone} de {v2.topicsTotal || "—"} temas dominados{v2.next ? ` · luego ${v2.next}` : ""}
            </p>
          </div>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[#2e3166]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Avance del nivel ${v2.level}`}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: LEVEL_COLOR[v2.level] }} />
        </div>
        {v2.levelComplete && v2.next ? (
          <Link href="/placement" className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-learn font-extrabold text-ink">
            <Trophy className="size-5" aria-hidden /> Haz la prueba para subir a {v2.next}
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        ) : (
          v2.nextTopic && (
            <Link href="/mike" className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-brand-soft font-extrabold text-ink">
              Siguiente: {v2.nextTopic} <ArrowRight className="size-5" aria-hidden />
            </Link>
          )
        )}
        {v2.journey.length > 1 && (
          <p className="text-xs text-[#b9bce6]">
            Tu camino: {v2.journey.map((j) => `${j.level} (${j.date.slice(5).replace("-", "/")})`).join(" → ")}
          </p>
        )}
      </section>

      {/* Números */}
      <section className="grid grid-cols-2 gap-3 pm-rise">
        <Stat icon={<Flame className="size-4 text-[#ea580c]" aria-hidden />} label="Racha" value={`${p.streak_days} ${p.streak_days === 1 ? "día" : "días"}`} />
        <Stat icon={<Clock className="size-4 text-brand" aria-hidden />} label="Esta semana" value={`${weekTotal} min`} hint={`Meta: ${p.daily_goal_minutes} min al día`} />
        <Stat icon={<BookOpen className="size-4 text-write" aria-hidden />} label="Último mes" value={`${v2.monthMinutes} min`} hint="Tiempo real estudiando" />
        <Stat icon={<Layers className="size-4 text-review" aria-hidden />} label="Repaso" value={`${review.total}`} hint={review.due ? `${review.due} para hoy` : "Al día ✓"} />
      </section>

      {/* Ya puedo */}
      <section className="pm-rise">
        <h2 className={sectionTitle}>Ya puedo… ({v2.level})</h2>
        {v2.canDo.length === 0 ? (
          <p className="rounded-[20px] bg-white p-4 text-sm text-muted">Cuando domines tu primer tema aparecerá aquí. ¡Vamos con Mike!</p>
        ) : (
          <ul className="space-y-2">
            {v2.canDo.map((t) => (
              <li key={t} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <CheckCircle2 className="size-5 shrink-0 text-[#16a34a]" aria-hidden />
                <span className="font-semibold">{t}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Semana */}
      <section className="pm-rise">
        <h2 className={sectionTitle}>Minutos por día · meta {p.daily_goal_minutes}</h2>
        <div className="rounded-[20px] bg-white p-4">
          <div className="flex h-36 items-end gap-2">
            {p.week.map((d, i) => {
              const h = Math.min(100, (d.minutes / Math.max(1, p.daily_goal_minutes)) * 100);
              const color = d.minutes === 0 ? "bg-line" : d.minutes >= p.daily_goal_minutes ? "bg-[#16a34a]" : "bg-brand-soft";
              return (
                <div key={`${d.day}-${i}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-bold text-muted">{d.minutes || ""}</span>
                  <div className={`w-full rounded-t-lg ${color}`} style={{ height: `${Math.max(4, h * 0.8)}%` }} />
                  <span className={`text-xs font-bold ${i === 6 ? "text-brand" : "text-muted"}`}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Actividades */}
      <section className="pm-rise">
        <h2 className={sectionTitle}>En qué usaste tu tiempo (30 días)</h2>
        <div className="space-y-3 rounded-[20px] bg-white p-4">
          {v2.activity.map((a) => (
            <div key={a.key} className="grid grid-cols-[120px_1fr_56px] items-center gap-3 text-sm">
              <span className="font-semibold">{ACTIVITY_LABEL[a.key]}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-line">
                <span className={`block h-full rounded-full ${ACTIVITY_COLOR[a.key]}`} style={{ width: `${(a.minutes / maxActivity) * 100}%` }} />
              </span>
              <span className="text-right font-bold">{a.minutes} min</span>
            </div>
          ))}
        </div>
      </section>

      {/* Errores */}
      <section className="pm-rise">
        <h2 className={sectionTitle}>Tus errores más frecuentes</h2>
        {p.top_errors.length === 0 ? (
          <p className="rounded-[20px] bg-white p-4 text-sm text-muted">Sin errores pendientes. Los que cometas vuelven en tu repaso hasta que los superes.</p>
        ) : (
          <ul className="space-y-2.5">
            {p.top_errors.map((e) => (
              <li key={e.error_type} className="rounded-[20px] bg-white p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold">{e.error_type.replace(/_/g, " ")}</span>
                  <span className="shrink-0 text-muted">{e.count} {e.count === 1 ? "vez" : "veces"}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-line">
                  <div className="h-2 rounded-full bg-speak" style={{ width: `${(e.count / maxErrors) * 100}%` }} />
                </div>
                <p className="mt-2.5 text-sm">
                  <s className="text-[#dc2626]">{e.example_wrong}</s>
                  <span className="mx-2 text-muted">→</span>
                  <b className="text-[#15803d]">{e.example_right}</b>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
