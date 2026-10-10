// components/today/today-view.tsx
// Pantalla Hoy: el plan del día. Una sola acción principal: empezar la sesión.
import Link from "next/link";
import { ArrowRight, BookOpen, Briefcase, Flame, PenLine, Sparkles, Target } from "lucide-react";
import type { TodayPlan } from "@/lib/today-plan";

const RING = 2 * Math.PI * 34;

const STEPS = [
  { n: 1, label: "Aprende", desc: "El tema explicado con ejemplos y audio", min: "5 min", color: "bg-learn text-[#2b1d00]", Icon: BookOpen },
  { n: 2, label: "Practica", desc: "6 ejercicios con calificación al instante", min: "8 min", color: "bg-practice text-white", Icon: Target },
  { n: 3, label: "Escribe", desc: "Tus frases, corregidas por Professor Mike", min: "5 min", color: "bg-write text-white", Icon: PenLine },
];

export function TodayView({ plan }: { plan: TodayPlan }) {
  const offset = RING * (1 - plan.goalPct / 100);
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

      {/* Lo que harás hoy */}
      <section className="space-y-3 pm-rise" aria-labelledby="steps-title">
        <h2 id="steps-title" className="text-xs font-bold uppercase tracking-widest text-muted">
          Lo que harás hoy · ~18 min
        </h2>
        <ol className="space-y-2.5">
          {STEPS.map(({ n, label, desc, min, color, Icon }) => (
            <li key={n} className="flex items-center gap-3.5 rounded-2xl bg-white px-4 py-3.5">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="size-5" aria-hidden strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{label}</p>
                <p className="text-sm text-muted">{desc}</p>
              </div>
              <span className="text-sm font-semibold text-muted">{min}</span>
            </li>
          ))}
          <li className="flex items-center gap-3.5 rounded-2xl border-2 border-dashed border-line px-4 py-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand">
              <Sparkles className="size-5" aria-hidden strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-muted">Repaso, escucha y habla</p>
              <p className="text-sm text-muted">Llegan en las próximas fases</p>
            </div>
          </li>
        </ol>
      </section>

      {/* Ruta profesional */}
      <section className="flex items-center gap-4 rounded-[22px] bg-[#ddf5ef] px-5 py-4 text-[#0b5148] pm-rise">
        <Briefcase className="size-8 shrink-0" aria-hidden strokeWidth={2} />
        <div>
          <p className="font-extrabold">Ruta Power Apps English</p>
          <p className="text-sm">Standups, demos, requisitos y entrevistas · próximamente</p>
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
