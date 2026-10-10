// components/today/today-view.tsx
// Pantalla Hoy: el plan del día. Una sola acción principal: empezar la sesión.
import Link from "next/link";
import { ArrowRight, BookOpen, Briefcase, Flame, Layers, PenLine, Sparkles, Target } from "lucide-react";
import type { TodayPlan } from "@/lib/today-plan";

const RING = 2 * Math.PI * 34;

const STEPS = [
  { n: 1, label: "Aprende y escucha", desc: "Ideas clave, frases con audio y palabras nuevas", min: "7 min", color: "bg-learn text-[#2b1d00]", Icon: BookOpen },
  { n: 2, label: "Practica", desc: "Un ejercicio a la vez, con respuesta al instante", min: "6 min", color: "bg-practice text-white", Icon: Target },
  { n: 3, label: "Escribe", desc: "Tus frases, corregidas por Professor Mike", min: "5 min", color: "bg-write text-white", Icon: PenLine },
];

export function TodayView({ plan, reviewDue }: { plan: TodayPlan; reviewDue: number }) {
  const offset = RING * (1 - plan.goalPct / 100);
  const reviewInSession = Math.min(reviewDue, 8);
  const steps = [
    ...(reviewInSession > 0
      ? [{ n: 0, label: "Repaso", desc: `${reviewInSession} ${reviewInSession === 1 ? "tarjeta que estás" : "tarjetas que estás"} por olvidar`, min: `${Math.max(1, Math.round(reviewInSession / 2))} min`, color: "bg-review text-white", Icon: Layers }]
      : []),
    ...STEPS,
  ];
  const cta = plan.allDone
    ? "Repasar el nivel"
    : plan.studiedToday
      ? "Continuar la sesión"
      : "Empezar la sesión";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 pm-rise">
        <div>
          <p className="text-sm font-semibold text-muted">{plan.dateLabel}</p>
          <h1 className="mt-0.5 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{plan.greeting}</h1>
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#ffe8d6] px-3 py-2 text-[15px] font-bold text-[#9a3412]"
          aria-label={`Racha de ${plan.streak} días`}
        >
          <Flame className="size-[18px]" aria-hidden strokeWidth={2.4} />
          {plan.streak} {plan.streak === 1 ? "día" : "días"}
        </div>
      </header>

      {/* Tarjeta principal: meta del día + tema + acción */}
      <section className="space-y-5 rounded-[28px] bg-ink p-6 text-white pm-rise" aria-labelledby="today-title">
        <div className="flex items-center gap-5">
          <div className="relative size-[88px] shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
              <circle cx="44" cy="44" r="34" fill="none" stroke="#2e3166" strokeWidth="10" />
              <circle
                cx="44"
                cy="44"
                r="34"
                fill="none"
                stroke={plan.goalDone ? "#4ade80" : "#8b7cff"}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={offset}
                transform="rotate(-90 44 44)"
                style={{ transition: "stroke-dashoffset .8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-extrabold">{plan.todayMinutes}</span>
              <span className="text-[11px] text-[#b9bce6]">/ {plan.goalMinutes} min</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[#b9bce6]">
              {plan.goalDone ? "¡Meta del día cumplida!" : "Tu sesión de hoy"}
            </p>
            <p id="today-title" className="mt-1 font-display text-[22px] font-bold leading-tight">
              {plan.topic?.title ?? (plan.allDone ? `Completaste el nivel ${plan.level}` : "Tu primera lección te espera")}
            </p>
            <p className="mt-1.5 text-sm text-[#b9bce6]">
              {plan.level}
              {plan.topic ? ` · Tema ${plan.topic.position} de ${plan.topic.total}` : ""}
            </p>
          </div>
        </div>
        <Link
          href="/lesson"
          className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand-soft px-5 text-[17px] font-extrabold text-ink transition-transform active:scale-[0.98]"
        >
          {cta}
          <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
        </Link>
      </section>

      {/* Mapa de la sesión: informativo (no son botones); la acción es "Empezar la sesión" */}
      <section className="rounded-[24px] bg-white/60 px-5 py-5 pm-rise" aria-labelledby="steps-title">
        <h2 id="steps-title" className="text-xs font-bold uppercase tracking-widest text-muted">
          Así será tu sesión · ~18 min
        </h2>
        <ol className="mt-4">
          {steps.map(({ n, label, desc, min, color, Icon }, idx) => (
            <li key={n} className="relative flex gap-4 pb-5 last:pb-0">
              {idx < steps.length - 1 && (
                <span className="absolute left-5 top-11 h-[calc(100%-36px)] w-0.5 bg-line" aria-hidden />
              )}
              <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-full ${color}`}>
                <Icon className="size-5" aria-hidden strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="font-bold">
                  {label} <span className="font-semibold text-muted">· {min}</span>
                </p>
                <p className="text-sm text-muted">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm text-muted">
          <Sparkles className="size-4 shrink-0 text-brand" aria-hidden strokeWidth={2.2} />
          Próximamente: escucha con historias y habla con Professor Mike.
        </p>
      </section>

      {reviewDue > 8 && (
        <Link href="/review" className="flex items-center gap-4 rounded-[22px] bg-review px-5 py-4 text-white pm-rise">
          <Layers className="size-8 shrink-0" aria-hidden strokeWidth={2} />
          <div className="flex-1">
            <p className="font-extrabold">{reviewDue} tarjetas para repasar</p>
            <p className="text-sm text-white/85">Ponte al día en la pestaña Repaso</p>
          </div>
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      )}

      {/* Ruta profesional */}
      <section className="flex items-center gap-4 rounded-[22px] bg-[#ddf5ef] px-5 py-4 text-[#0b5148] pm-rise">
        <Briefcase className="size-8 shrink-0" aria-hidden strokeWidth={2} />
        <div>
          <p className="font-extrabold">Inglés para tu trabajo</p>
          <p className="text-sm">Reuniones, correos y entrevistas de desarrollador · próximamente</p>
        </div>
      </section>
    </div>
  );
}

export function TodaySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-16 w-56 animate-pulse rounded-xl bg-line" />
      <div className="h-56 animate-pulse rounded-[28px] bg-line" />
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  );
}
