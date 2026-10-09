// app/(app)/progress/page.tsx
// CP-0.5: datos de prueba. CP-4: consultas a Supabase (profile, sessions, errors).
import { MOCK_PROGRESS as p } from "@/lib/mock/progress";

const card =
  "rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";
const sectionTitle = "mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={card}>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function ProgressPage() {
  const weekTotal = p.week.reduce((sum, d) => sum + d.minutes, 0);
  const weekGoal = p.daily_goal_minutes * 6; // 6 días de estudio + 1 de descanso
  const maxErrors = Math.max(1, ...p.top_errors.map((e) => e.count));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Datos de prueba
        </span>
        <h1 className="text-2xl font-semibold md:text-3xl">Tu avance</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Nivel" value={p.cefr_level} hint="Meta: C1" />
        <Stat label="Temas" value={`${p.topics_completed}/${p.topics_total}`} hint={`Nivel ${p.cefr_level}`} />
        <Stat label="Esta semana" value={`${weekTotal} min`} hint={`Meta: ${weekGoal} min`} />
        <Stat label="Racha" value={`${p.streak_days} días`} />
      </section>

      <section>
        <h2 className={sectionTitle}>Minutos por día · meta {p.daily_goal_minutes}</h2>
        <div className={card}>
          <div className="flex h-40 items-end gap-2">
            {p.week.map((d) => {
              const pct = Math.min(100, (d.minutes / p.daily_goal_minutes) * 100);
              const color =
                d.minutes === 0
                  ? "bg-zinc-200 dark:bg-zinc-800"
                  : d.minutes >= p.daily_goal_minutes
                    ? "bg-blue-600"
                    : "bg-blue-300 dark:bg-blue-800";
              return (
                <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs text-zinc-500">{d.minutes}</span>
                  <div className={`w-full rounded-t-md ${color}`} style={{ height: `${Math.max(4, pct * 0.8)}%` }} />
                  <span className="text-xs font-medium">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <h2 className={sectionTitle}>Tus 5 errores más frecuentes</h2>
        <ul className="space-y-3">
          {p.top_errors.map((e) => (
            <li key={e.error_type} className={card}>
              <div className="flex items-center justify-between gap-3">
                <code className="text-sm font-semibold">{e.error_type}</code>
                <span className="shrink-0 text-sm text-zinc-500">{e.count} veces</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-2 rounded-full bg-red-500" style={{ width: `${(e.count / maxErrors) * 100}%` }} />
              </div>
              <p className="mt-3 text-sm">
                <span className="text-red-600 line-through dark:text-red-400">{e.example_wrong}</span>
                <span className="mx-2 text-zinc-400">→</span>
                <span className="font-medium text-green-700 dark:text-green-400">{e.example_right}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}