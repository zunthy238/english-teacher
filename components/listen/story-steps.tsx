"use client";
// components/listen/story-steps.tsx
// Las 4 pantallas de una historia para escuchar. Se usan dentro de la sesión diaria y en la biblioteca "Historias".
// Método: anticipar palabras → escuchar sin texto (idea general) → preguntas con la parte exacta →
// leer mientras se escucha → dictado corto (afina el oído para contracciones y uniones del habla).
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Headphones, Languages, Pause, Play, RotateCcw, Snail, Star, Volume2, X } from "lucide-react";
import type { Story } from "@/lib/schemas/story";
import { sameAnswer } from "@/lib/grade";
import { diffDictation } from "@/lib/story-validate";
import { speakLines, stopSpeech, vibrate, type SpokenLine } from "@/components/lesson/speech";

export const storyBtn =
  "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40";
const AVATAR = ["bg-learn text-ink", "bg-[#4ade80] text-ink"];

function spoken(story: Story, only?: number[]): SpokenLine[] {
  const idx = only ?? story.lines.map((_, i) => i);
  return idx.map((i) => ({
    text: story.lines[i].en,
    speaker: story.lines[i].speaker,
    gender: story.speakers[story.lines[i].speaker].gender,
  }));
}

// Reproductor con estado: qué línea suena y si está sonando
function usePlayer(story: Story) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const stop = useRef<() => void>(() => undefined);
  useEffect(() => () => stop.current(), []);
  function play(only?: number[], slow = false) {
    stop.current();
    const map = only ?? story.lines.map((_, i) => i);
    setPlaying(true);
    stop.current = speakLines(spoken(story, only), {
      slow,
      onLine: (k) => setCurrent(map[k]),
      onEnd: () => {
        setPlaying(false);
        setCurrent(null);
      },
    });
  }
  function halt() {
    stop.current();
    setPlaying(false);
    setCurrent(null);
  }
  return { playing, current, play, halt };
}

function Tag({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-extrabold uppercase tracking-widest text-listen">{children}</p>;
}

function Wave({ on }: { on: boolean }) {
  const bars = [8, 18, 12, 24, 14, 20, 9, 22, 13, 17, 7];
  return (
    <span className="flex h-7 items-center gap-[3px]" aria-hidden>
      {bars.map((h, i) => (
        <i
          key={i}
          className={`w-1 rounded-full bg-white/75 ${on ? "animate-pulse" : ""}`}
          style={{ height: on ? h : 6, animationDelay: `${i * 90}ms`, transition: "height .3s" }}
        />
      ))}
    </span>
  );
}

/* 1 · Escuchar sin texto */
export function StoryListen({ story, onNext }: { story: Story; onNext: () => void }) {
  const { playing, play, halt } = usePlayer(story);
  const [slow, setSlow] = useState(false);
  const [plays, setPlays] = useState(0);
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Tag>Escucha · Historia</Tag>
      <div className="flex flex-col items-center gap-3 rounded-[28px] bg-listen p-6 text-center text-white">
        <span className="text-5xl" aria-hidden>{story.scene_emoji}</span>
        <h2 className="font-display text-[26px] font-extrabold leading-tight">{story.title}</h2>
        <div className="flex gap-2">
          {story.speakers.map((s, i) => (
            <span key={s.name} className="flex items-center gap-1.5 rounded-full bg-white/20 py-1 pl-1 pr-3 text-sm font-bold">
              <b className={`flex size-6 items-center justify-center rounded-full text-xs ${AVATAR[i]}`}>{s.name[0]}</b>
              {s.name}
            </span>
          ))}
        </div>
        {story.setting_es && <p className="text-sm text-white/85">{story.setting_es}</p>}
        <button
          type="button"
          aria-label={playing ? "Detener" : "Escuchar la historia"}
          onClick={() => {
            if (playing) return halt();
            setPlays((n) => n + 1);
            play(undefined, slow);
          }}
          className="flex size-20 items-center justify-center rounded-full bg-white text-listen transition-transform active:scale-95"
        >
          {playing ? <Pause className="size-9" aria-hidden strokeWidth={2.4} /> : <Play className="ml-1 size-9" aria-hidden strokeWidth={2.4} />}
        </button>
        <Wave on={playing} />
        <div className="flex gap-2" role="radiogroup" aria-label="Velocidad">
          {[
            { v: true, label: "🐢 0.75×" },
            { v: false, label: "1×" },
          ].map(({ v, label }) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={slow === v}
              onClick={() => setSlow(v)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-extrabold ${slow === v ? "bg-white text-listen" : "bg-white/20"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-muted">Palabras que vas a oír</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {story.key_words.map((k) => (
            <span key={k.word} className="rounded-xl bg-white px-3 py-2 text-sm font-bold">
              {k.word} <span className="font-semibold text-muted">· {k.meaning_es}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1" />
      <p className="text-center text-sm font-semibold text-muted">
        {plays === 0 ? "Escúchala completa, sin leer. Luego vienen las preguntas." : "Puedes escucharla otra vez si quieres."}
      </p>
      <button
        type="button"
        disabled={plays === 0}
        className={`${storyBtn} bg-ink text-white`}
        onClick={() => {
          halt();
          onNext();
        }}
      >
        Ya la escuché <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
      </button>
    </div>
  );
}

/* 2 · Preguntas */
export function StoryQuestion({
  story,
  index,
  onNext,
}: {
  story: Story;
  index: number; // 0-3
  onNext: (correct: boolean) => void;
}) {
  const q = story.questions[index];
  const { playing, play, halt } = usePlayer(story);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === q.answer;
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Tag>
        Pregunta {index + 1} de {story.questions.length}
        {index === 0 ? " · idea general" : ""}
      </Tag>
      <h2 className="font-display text-[26px] font-extrabold leading-tight">{q.question}</h2>
      <div className="flex flex-wrap gap-2">
        {!picked ? (
          <button
            type="button"
            onClick={() => (playing ? halt() : play())}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-listen"
          >
            {playing ? <Pause className="size-4" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
            {playing ? "Detener" : "Escuchar la historia otra vez"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => play([q.line], true)}
            className="flex items-center gap-2 rounded-full bg-listen px-4 py-2 text-sm font-extrabold text-white"
          >
            <Volume2 className="size-4" aria-hidden /> Oír esa parte
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {q.options.map((opt) => {
          let style = "border-line bg-white";
          if (picked) {
            if (opt === q.answer) style = "border-[#16a34a] bg-[#dcfce7] text-[#14532d]";
            else if (opt === picked) style = "border-[#dc2626] bg-[#fde2e2] text-[#7f1d1d]";
            else style = "border-line bg-white opacity-60";
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={picked !== null}
              aria-pressed={picked === opt}
              onClick={() => {
                halt();
                setPicked(opt);
                vibrate(opt === q.answer ? 25 : [40, 60, 40]);
              }}
              className={`flex min-h-[56px] items-center gap-2 rounded-2xl border-2 px-5 text-left text-lg font-bold transition-colors ${style}`}
            >
              {picked && opt === q.answer && <Check className="size-5 shrink-0" aria-hidden strokeWidth={3} />}
              {picked && opt === picked && opt !== q.answer && <X className="size-5 shrink-0" aria-hidden strokeWidth={3} />}
              {opt}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className={`rounded-2xl px-4 py-3 pm-rise ${correct ? "bg-[#dcfce7] text-[#14532d]" : "bg-[#fff4d6] text-[#5c3d00]"}`}>
          <p className="font-extrabold">{correct ? "¡Bien!" : "Casi. Escucha esa parte:"}</p>
          <p className="mt-1 italic">
            {story.speakers[story.lines[q.line].speaker].name}: “{story.lines[q.line].en}”
          </p>
          {q.explanation_es && <p className="mt-1 text-sm">{q.explanation_es}</p>}
        </div>
      )}
      <div className="flex-1" />
      <button
        type="button"
        disabled={!picked}
        className={`${storyBtn} bg-ink text-white`}
        onClick={() => {
          halt();
          onNext(correct);
        }}
      >
        Siguiente <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
      </button>
    </div>
  );
}

// Subraya las palabras clave dentro de una línea
function withKeyWords(text: string, words: string[]) {
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).filter(Boolean);
  if (!escaped.length) return text;
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <u key={i} className="decoration-2 underline-offset-4">
        {part}
      </u>
    ) : (
      part
    ),
  );
}

/* 3 · Transcripción: leer mientras se escucha */
export function StoryTranscript({ story, topicKey, onNext }: { story: Story; topicKey: string; onNext: () => void }) {
  const { playing, current, play, halt } = usePlayer(story);
  const [slow, setSlow] = useState(false);
  const [translate, setTranslate] = useState(story.cefr_level === "A1");
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const words = story.key_words.map((k) => k.word);

  function save(i: number) {
    if (saved.has(i)) return;
    setSaved((s) => new Set(s).add(i));
    vibrate(15);
    void fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_key: topicKey,
        cards: [{ kind: "phrase", front: story.lines[i].en, back: story.lines[i].es, extra: null, error_type: null }],
      }),
    }).catch(() => undefined);
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Tag>Lee mientras escuchas · toca una frase</Tag>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => (playing ? halt() : play(undefined, slow))}
          className="flex items-center gap-2 rounded-full bg-listen px-4 py-2 text-sm font-extrabold text-white"
        >
          {playing ? <Pause className="size-4" aria-hidden /> : <Headphones className="size-4" aria-hidden />}
          {playing ? "Detener" : "Escuchar todo"}
        </button>
        <button
          type="button"
          aria-pressed={translate}
          onClick={() => setTranslate((t) => !t)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${translate ? "bg-ink text-white" : "bg-white"}`}
        >
          <Languages className="size-4" aria-hidden /> Traducción
        </button>
        <button
          type="button"
          aria-pressed={slow}
          onClick={() => setSlow((s) => !s)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${slow ? "bg-ink text-white" : "bg-white"}`}
        >
          <Snail className="size-4" aria-hidden /> Lento
        </button>
      </div>
      <ol className="flex flex-col gap-2">
        {story.lines.map((line, i) => {
          const on = current === i;
          return (
            <li key={i} className={`flex items-start gap-2.5 rounded-2xl p-3 transition-colors ${on ? "bg-listen text-white" : "bg-white"}`}>
              <b className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${AVATAR[line.speaker]}`}>
                {story.speakers[line.speaker].name[0]}
              </b>
              <button type="button" onClick={() => play([i], slow)} className="flex-1 text-left text-[16px] leading-snug">
                {withKeyWords(line.en, words)}
                {translate && <span className={`mt-1 block text-[13px] ${on ? "text-white/85" : "text-muted"}`}>{line.es}</span>}
              </button>
              <button
                type="button"
                onClick={() => save(i)}
                aria-label={saved.has(i) ? "Guardada en tu repaso" : "Guardar en tu repaso"}
                className="flex size-9 shrink-0 items-center justify-center rounded-full"
              >
                <Star className={`size-5 ${saved.has(i) ? "fill-current" : ""}`} aria-hidden strokeWidth={2.2} />
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-center text-xs font-semibold text-muted">
        ★ guarda una frase en tu Repaso{saved.size ? ` · ${saved.size} guardada${saved.size === 1 ? "" : "s"}` : ""}
      </p>
      <button
        type="button"
        className={`${storyBtn} mt-1 bg-listen text-white`}
        onClick={() => {
          halt();
          onNext();
        }}
      >
        Dictado rápido <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
      </button>
    </div>
  );
}

/* 4 · Dictado */
export function StoryDictation({
  story,
  index,
  onNext,
}: {
  story: Story;
  index: number; // posición en story.dictation
  onNext: (correct: boolean) => void;
}) {
  const lineIndex = story.dictation[index];
  const line = story.lines[lineIndex];
  const { playing, play } = usePlayer(story);
  const [text, setText] = useState("");
  const [result, setResult] = useState<null | { correct: boolean; words: { word: string; ok: boolean }[] }>(null);

  function check() {
    const correct = sameAnswer(text, line.en);
    setResult({ correct, words: diffDictation(line.en, text) });
    vibrate(correct ? 25 : [40, 60, 40]);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Tag>
        Dictado · {index + 1} de {story.dictation.length}
      </Tag>
      <h2 className="font-display text-[24px] font-extrabold leading-tight">Escucha y escribe exactamente lo que oyes</h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => play([lineIndex])}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-listen py-4 font-extrabold text-white"
        >
          <Volume2 className={`size-5 ${playing ? "animate-pulse" : ""}`} aria-hidden /> Escuchar
        </button>
        <button
          type="button"
          onClick={() => play([lineIndex], true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 font-extrabold text-listen"
        >
          <Snail className="size-5" aria-hidden /> Lento
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={result !== null}
        rows={3}
        autoCapitalize="sentences"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Escribe aquí lo que oíste…"
        aria-label="Lo que oíste"
        className="w-full rounded-2xl border-2 border-line bg-white p-4 text-lg font-semibold outline-none focus:border-listen"
      />
      {result && (
        <div className={`rounded-2xl px-4 py-3 pm-rise ${result.correct ? "bg-[#dcfce7] text-[#14532d]" : "bg-[#fff4d6] text-[#5c3d00]"}`}>
          <p className="font-extrabold">{result.correct ? "¡Perfecto! Tu oído va afinando." : "Así era la frase:"}</p>
          <p className="mt-1 text-lg">
            {result.words.map((w, i) => (
              <span key={i} className={w.ok ? "" : "rounded bg-[#fde68a] px-1 font-extrabold text-[#7c2d12]"}>
                {w.word}{" "}
              </span>
            ))}
          </p>
          {!result.correct && <p className="mt-1 text-sm">Lo resaltado es lo que se te escapó. Escúchala otra vez en lento.</p>}
        </div>
      )}
      <div className="flex-1" />
      {result ? (
        <button type="button" className={`${storyBtn} bg-ink text-white`} onClick={() => onNext(result.correct)}>
          Siguiente <ArrowRight className="size-5" aria-hidden strokeWidth={2.6} />
        </button>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              setResult({ correct: false, words: diffDictation(line.en, "") });
            }}
            className="min-h-[56px] shrink-0 whitespace-nowrap rounded-2xl bg-white px-5 font-bold text-muted"
          >
            No lo sé
          </button>
          <button type="button" disabled={!text.trim()} className={`${storyBtn} bg-ink text-white`} onClick={check}>
            Comprobar
          </button>
        </div>
      )}
    </div>
  );
}
