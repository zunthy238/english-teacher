"use client";
// components/speak/speak-hub.tsx
// Pantalla "Hablar": repetir como nativo (gratis) + conversaciones según para qué quiere el inglés cada persona.
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Mic, Settings2 } from "lucide-react";
import { fillJob, PURPOSE_INFO, scenariosFor, type Purpose, type Scenario } from "@/lib/speak/scenarios";
import type { ShadowLine } from "@/lib/speak/shadow";
import { ShadowFlow } from "./shadow-flow";
import { TalkFlow } from "./talk-flow";

export function SpeakHub({
  goals,
  jobTitle,
  lines,
  source,
}: {
  goals: string[];
  jobTitle: string | null;
  lines: ShadowLine[];
  source: string; // de dónde salen las frases
}) {
  const [shadow, setShadow] = useState(false);
  const [talk, setTalk] = useState<Scenario | null>(null);
  const scenarios = scenariosFor(goals);
  // Primero lo más específico: trabajo → estudios → viajes → vida diaria
  const ORDER: Purpose[] = ["work", "study", "travel", "daily"];
  const purposes = ORDER.filter((p) => scenarios.some((s) => s.purpose === p));

  if (shadow) {
    return (
      <ShadowFlow
        lines={lines}
        onExit={() => setShadow(false)}
        onTalk={() => {
          setShadow(false);
          setTalk(scenarios.find((s) => s.purpose === purposes[0]) ?? scenarios[0]);
        }}
      />
    );
  }
  if (talk) return <TalkFlow scenario={talk} jobTitle={jobTitle} onExit={() => setTalk(null)} />;

  return (
    <div className="space-y-6">
      <header className="space-y-1 pm-rise">
        <p className="text-sm font-bold uppercase tracking-widest text-speak">Hablar</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Habla con Professor Mike</h1>
        <p className="text-muted">Pierde el miedo: repite, conversa y recibe correcciones al final.</p>
      </header>

      <button
        type="button"
        onClick={() => setShadow(true)}
        className="flex w-full items-center gap-4 rounded-[24px] bg-speak px-5 py-5 text-left text-white transition-transform active:scale-[0.98] pm-rise"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <Mic className="size-7" aria-hidden strokeWidth={2.2} />
        </span>
        <span className="flex-1">
          <span className="block text-lg font-extrabold">Repite como nativo</span>
          <span className="block text-sm text-white/85">{lines.length} frases · {source} · gratis</span>
        </span>
        <ArrowRight className="size-5" aria-hidden />
      </button>

      {purposes.map((p) => (
        <section key={p} className="space-y-3 pm-rise" aria-labelledby={`sec-${p}`}>
          <h2 id={`sec-${p}`} className="text-xs font-extrabold uppercase tracking-widest text-muted">
            {PURPOSE_INFO[p].emoji} Conversaciones · {PURPOSE_INFO[p].label}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {scenarios
              .filter((s) => s.purpose === p)
              .map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setTalk(s)}
                    className="flex h-full w-full items-center gap-3 rounded-[20px] bg-white px-4 py-4 text-left transition-transform active:scale-[0.98]"
                  >
                    <span className="text-3xl" aria-hidden>{s.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold leading-tight">{fillJob(s.title, jobTitle).replace(" – professional", "")}</span>
                      <span className="mt-0.5 block text-sm text-muted">{s.goal_es}</span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <Link href="/settings" className="flex items-center gap-3 rounded-[20px] bg-white/60 px-4 py-3 text-sm text-muted">
        <Settings2 className="size-5 shrink-0" aria-hidden />
        <span className="flex-1">
          ¿Quieres otros escenarios? Elige <b className="text-ink">para qué quieres el inglés</b> en Ajustes.
        </span>
      </Link>
      <p className="text-center text-xs text-muted">Cada conversación usa unas 7 solicitudes de tu cuota diaria (menos de 1 centavo).</p>
    </div>
  );
}
