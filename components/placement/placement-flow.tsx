"use client";
// components/placement/placement-flow.tsx
// Prueba de nivel adaptativa: bienvenida → 15 preguntas (sin calificar una por una) → resultado → elegir inicio.
// Ciencia detrás: sin retroalimentación durante la prueba (baja la ansiedad y no contamina la medición),
// "No lo sé" en vez de adivinar (resultado más honesto) y ubicación conservadora (mejor consolidar que frustrarse).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Headphones, Loader2, Volume2, X } from "lucide-react";
import { shuffledOptions, type Skill } from "@/lib/placement/bank";
import {
  LEVELS, TEST_LENGTH, allowedStartLevels, nextItem, scorePlacement, toResponses, type Answer,
} from "@/lib/placement/engine";
import type { CefrLevel } from "@/lib/schemas/lesson";
import { speak, vibrate } from "@/components/lesson/speech";

const SKILL: Record<Skill, { label: string; tag: string; bar: string; card: string }> = {
  grammar: { label: "Gramática", tag: "text-practice", bar: "bg-practice", card: "bg-white text-ink" },
  vocab: { label: "Vocabulario", tag: "text-review", bar: "bg-review", card: "bg-white text-ink" },
  reading: { label: "Lectura", tag: "text-write", bar: "bg-write", card: "bg-white text-ink" },
  listening: { label: "Escucha", tag: "text-listen", bar: "bg-listen", card: "bg-listen text-white" },
};

export const LEVEL_INFO: Record<CefrLevel, { name: string; can: string; color: string }> = {
  A1: { name: "Principiante", can: "Entiendes y usas frases básicas del día a día.", color: "#4ade80" },
  A2: { name: "Básico", can: "Te comunicas en tareas simples y rutinarias.", color: "#38bdf8" },
  B1: { name: "Intermedio", can: "Te defiendes en situaciones del día a día y del trabajo.", color: "#8b7cff" },
  B2: { name: "Intermedio alto", can: "Hablas con soltura de temas complejos y de tu trabajo.", color: "#f87171" },
  C1: { name: "Avanzado", can: "Usas el inglés con flexibilidad en entornos profesionales.", color: "#ffc93c" },
};

const MAX_PLAYS = 2;
const btnBase =
  "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40";

// Muestra el espacio "___" como una línea visible
function Blank({ text }: { text: string }) {
  const parts = text.split("___");
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className="mx-1 inline-block w-14 border-b-[3px] border-current align-baseline opacity-60" aria-label="espacio en blanco" />}
        </span>
      ))}
    </>
  );
}

export function PlacementFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [plays, setPlays] = useState(0);
  const [saving, setSaving] = useState<CefrLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<{ level: string; tested: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setPrevious({ level: p.cefr_level, tested: Boolean(p.placement_at) }))
      .catch(() => {});
  }, []);

  const responses = useMemo(() => toResponses(answers), [answers]);
  const item = phase === "test" ? nextItem(responses) : null;
  const options = useMemo(() => (item ? shuffledOptions(item) : []), [item]);
  const result = useMemo(() => (phase === "result" ? scorePlacement(answers) : null), [phase, answers]);

  function record(choice: string | null) {
    if (!item) return;
    vibrate(15);
    const next = [...answers, { id: item.id, choice }];
    setAnswers(next);
    setSelected(null);
    setPlays(0);
    if (next.length >= TEST_LENGTH) setPhase("result");
  }

  function play() {
    if (!item?.audio || plays >= MAX_PLAYS) return;
    speak(item.audio);
    setPlays((n) => n + 1);
  }

  async function start(level: CefrLevel) {
    setSaving(level);
    setError(null);
    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, start_level: level }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "No se pudo guardar.");
      router.replace("/today");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Revisa tu conexión.");
      setSaving(null);
    }
  }

  // ───────── BIENVENIDA ─────────
  if (phase === "intro") {
    return (
      <Shell>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4 pt-[max(20px,env(safe-area-inset-top))] pm-rise">
          <div className="flex justify-end">
            <Link href="/today" aria-label="Salir" className="flex size-11 items-center justify-center rounded-2xl bg-white">
              <X className="size-5" aria-hidden strokeWidth={2.6} />
            </Link>
          </div>
          <div className="space-y-2 rounded-[28px] bg-learn p-6 text-ink">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em]">Prueba de nivel</p>
            <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-tight">Encontremos tu punto de partida</h1>
            <p className="text-[17px]">Así no repites lo que ya sabes ni te saltas lo que te falta.</p>
          </div>
          <div className="flex h-28 items-end gap-1.5 px-1" aria-hidden>
            {LEVELS.map((lv, i) => (
              <div
                key={lv}
                className="flex flex-1 justify-center rounded-t-xl rounded-b-md pt-2 text-sm font-extrabold text-ink"
                style={{ height: `${30 + i * 17.5}%`, background: LEVEL_INFO[lv].color }}
              >
                {lv}
              </div>
            ))}
          </div>
          <ul className="flex flex-wrap gap-2 text-sm font-bold">
            <li className="rounded-full bg-white px-3.5 py-2">⏱ 6 min</li>
            <li className="rounded-full bg-white px-3.5 py-2">❓ {TEST_LENGTH} preguntas</li>
            <li className="rounded-full bg-white px-3.5 py-2">🎧 Sube el volumen</li>
            <li className="rounded-full bg-white px-3.5 py-2">🧠 Se adapta a ti</li>
          </ul>
          <p className="text-[15px] text-muted">
            Si aciertas, las preguntas suben de nivel; si no, bajan. No verás si acertaste hasta el final.
            Si no sabes una, toca <b className="text-ink">No lo sé</b>: es mejor que adivinar.
          </p>
        </div>
        <Footer>
          <button type="button" className={`${btnBase} bg-brand text-white`} onClick={() => setPhase("test")}>
            Empezar la prueba <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
          </button>
        </Footer>
      </Shell>
    );
  }

  // ───────── RESULTADO ─────────
  if (phase === "result" && result) {
    const info = LEVEL_INFO[result.level];
    const starts = allowedStartLevels(result.level);
    const skills = (["grammar", "vocab", "reading", "listening"] as Skill[]).map((s) => ({ s, ...result.skills[s] }));
    return (
      <Shell dark>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4 pt-[max(28px,env(safe-area-inset-top))]">
          <div className="flex flex-col items-center gap-3 text-center pm-pop">
            <div className="flex size-32 flex-col items-center justify-center rounded-full text-ink" style={{ background: info.color }}>
              <span className="font-display text-5xl font-black leading-none">{result.level}</span>
              <span className="mt-1 text-[11px] font-extrabold uppercase tracking-wider">{info.name}</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold">Tu nivel es {result.level}</h1>
            <p className="max-w-xs text-[#b9bce6]">{info.can}</p>
            {previous?.tested && previous.level !== result.level && (
              <p className="rounded-full bg-ink-soft px-3 py-1 text-sm font-bold">Antes: {previous.level} → Ahora: {result.level}</p>
            )}
          </div>

          <div className="space-y-3 rounded-[22px] bg-ink-soft p-5">
            {skills.map(({ s, level, pct }) => (
              <div key={s} className="grid grid-cols-[96px_1fr_34px] items-center gap-3 text-sm font-bold">
                <span>{SKILL[s].label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-[#3a3e7a]">
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: LEVEL_INFO[level].color }} />
                </span>
                <span className="text-right">{level}</span>
              </div>
            ))}
            <p className="pt-1 text-xs text-[#b9bce6]">
              {result.correct} de {result.total} correctas · las preguntas se ajustaron a tu nivel
            </p>
          </div>

          <div className="rounded-[22px] bg-[#ddf5ef] px-5 py-4 text-[#0b5148]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em]">Tu ruta empieza en</p>
            <p className="mt-1 text-lg font-extrabold">{result.level} · Tema 1</p>
            <p className="mt-0.5 text-sm">
              {result.focus
                ? `Reforzaremos más tu ${SKILL[result.focus].label.toLowerCase()} con el repaso diario.`
                : "Tus habilidades están parejas: avanzamos en todas a la vez."}
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-[#fde2e2] px-4 py-3 text-sm text-[#7f1d1d]">
              {error}
            </p>
          )}
        </div>
        <Footer dark>
          <button type="button" className={`${btnBase} bg-brand-soft text-ink`} disabled={saving !== null} onClick={() => start(starts[0])}>
            {saving === starts[0] ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
            Empezar en {starts[0]} <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
          </button>
          {starts[1] && (
            <button
              type="button"
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-ink-soft font-bold disabled:opacity-40"
              disabled={saving !== null}
              onClick={() => start(starts[1])}
            >
              {saving === starts[1] ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Prefiero empezar en {starts[1]} para consolidar
            </button>
          )}
        </Footer>
      </Shell>
    );
  }

  // ───────── PREGUNTA ─────────
  if (!item) return null;
  const theme = SKILL[item.skill];
  const n = answers.length + 1;
  return (
    <Shell>
      <div className="flex items-center gap-3 px-5 pb-2 pt-[max(16px,env(safe-area-inset-top))]">
        <Link href="/today" aria-label="Salir de la prueba" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">
          <X className="size-5" aria-hidden strokeWidth={2.6} />
        </Link>
        <div
          className="h-3 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={n}
          aria-valuemin={1}
          aria-valuemax={TEST_LENGTH}
          aria-label="Avance de la prueba"
        >
          <div className={`h-full rounded-full transition-all duration-500 ${theme.bar}`} style={{ width: `${(answers.length / TEST_LENGTH) * 100}%` }} />
        </div>
        <span className="w-12 text-right text-sm font-bold text-muted">
          {n}/{TEST_LENGTH}
        </span>
      </div>

      <div key={item.id} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 pb-4 pt-2 pm-rise">
        <p className={`text-xs font-extrabold uppercase tracking-[0.2em] ${theme.tag}`}>{theme.label}</p>

        {item.skill === "listening" ? (
          <div className={`flex flex-col items-center gap-3 rounded-[28px] p-6 text-center ${theme.card}`}>
            <button
              type="button"
              onClick={play}
              disabled={plays >= MAX_PLAYS}
              aria-label="Escuchar el audio"
              className="flex size-20 items-center justify-center rounded-full bg-white text-listen transition-transform active:scale-95 disabled:opacity-50"
            >
              {plays === 0 ? <Headphones className="size-9" aria-hidden strokeWidth={2.2} /> : <Volume2 className="size-9" aria-hidden strokeWidth={2.2} />}
            </button>
            <p className="font-display text-xl font-extrabold leading-snug">{item.prompt}</p>
            <p className="text-sm opacity-85">
              {plays === 0 ? "Toca para escuchar · puedes oírlo 2 veces" : plays < MAX_PLAYS ? "Puedes escucharlo 1 vez más" : "Ya no quedan repeticiones"}
            </p>
          </div>
        ) : item.skill === "reading" ? (
          <>
            <div className="rounded-[24px] bg-white p-5 text-[17px] leading-relaxed">{item.passage}</div>
            <p className="font-display text-xl font-extrabold leading-snug">{item.prompt}</p>
          </>
        ) : (
          <div className={`rounded-[28px] p-6 ${theme.card}`}>
            <p className="font-display text-[26px] font-extrabold leading-snug">
              <Blank text={item.prompt} />
            </p>
            <p className="mt-2 text-sm text-muted">Elige la opción correcta</p>
          </div>
        )}

        <div className="grid gap-2.5" role="group" aria-label="Opciones">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={selected === opt}
              onClick={() => setSelected(opt)}
              className={`min-h-[56px] rounded-2xl border-[3px] px-4 py-3 text-left text-[17px] font-bold transition-colors ${
                selected === opt ? "border-brand bg-[#f0ecff]" : "border-transparent bg-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => record(null)} className="mx-auto px-4 py-2 font-bold text-muted underline-offset-4 hover:underline">
          No lo sé
        </button>
      </div>

      <Footer>
        <button type="button" className={`${btnBase} bg-ink text-white`} disabled={selected === null} onClick={() => record(selected)}>
          {n === TEST_LENGTH ? "Ver mi resultado" : "Siguiente"} <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
        </button>
      </Footer>
    </Shell>
  );
}

function Shell({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`fixed inset-0 z-[60] flex flex-col ${dark ? "bg-ink text-white" : "bg-canvas text-ink"}`}>
      <div className="mx-auto flex h-full w-full max-w-xl flex-col">{children}</div>
    </div>
  );
}

function Footer({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`space-y-2.5 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 ${dark ? "bg-ink" : "bg-canvas"}`}>{children}</div>
  );
}
