"use client";
// components/speak/shadow-flow.tsx
// "Repite como nativo" (shadowing): escuchas la frase, la repites y ves qué palabras se entendieron. Gratis.
import { useState } from "react";
import { ArrowRight, RotateCcw, Snail, Volume2, X } from "lucide-react";
import { scoreShadow, type ShadowLine } from "@/lib/speak/shadow";
import { speak, stopSpeech, vibrate } from "@/components/lesson/speech";
import { useSpeechInput } from "./use-speech-input";
import { MicButton } from "./mic-button";

const btn =
  "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40";

export function ShadowFlow({ lines, onExit, onTalk }: { lines: ShadowLine[]; onExit: () => void; onTalk: () => void }) {
  const mic = useSpeechInput();
  const [i, setI] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof scoreShadow> | null>(null);
  const [heard, setHeard] = useState("");
  const [best, setBest] = useState<number[]>([]);
  const line = lines[i];

  async function attempt() {
    if (mic.state === "listening") return mic.stop();
    const text = await mic.listen();
    if (!text) return;
    const r = scoreShadow(line.en, text);
    setHeard(text);
    setResult(r);
    setBest((b) => {
      const n = [...b];
      n[i] = Math.max(n[i] ?? 0, r.pct);
      return n;
    });
    vibrate(r.pass ? 25 : [40, 60, 40]);
  }

  function next() {
    stopSpeech();
    mic.setError(null);
    setResult(null);
    setHeard("");
    setI((n) => n + 1);
  }

  const done = i >= lines.length;
  const avg = best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-canvas text-ink">
      <div className="mx-auto flex h-full w-full max-w-xl flex-col">
        <div className="flex items-center gap-3 px-5 pb-2 pt-[max(16px,env(safe-area-inset-top))]">
          <button type="button" onClick={() => { mic.stop(); stopSpeech(); onExit(); }} aria-label="Salir" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">
            <X className="size-5" aria-hidden strokeWidth={2.6} />
          </button>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-speak transition-all duration-500" style={{ width: `${(Math.min(i, lines.length) / lines.length) * 100}%` }} />
          </div>
          <span className="w-12 text-right text-sm font-bold text-muted">{Math.min(i + 1, lines.length)}/{lines.length}</span>
        </div>

        {done ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center pm-pop">
            <span className="text-6xl" aria-hidden>🗣️</span>
            <h2 className="font-display text-3xl font-extrabold">¡Bien hablado!</h2>
            <p className="text-lg text-muted">Tu pronunciación promedio: <b className="text-ink">{avg}%</b></p>
            <p className="text-muted">{avg >= 80 ? "Se te entiende muy bien. Ahora ponlo a prueba en una conversación." : "Repetir en voz alta todos los días es lo que más mejora tu acento."}</p>
            <div className="mt-2 flex w-full flex-col gap-3">
              <button type="button" className={`${btn} bg-speak text-white`} onClick={onTalk}>
                Conversar con Mike <ArrowRight className="size-5" aria-hidden />
              </button>
              <button type="button" className={`${btn} bg-white`} onClick={() => { setI(0); setBest([]); }}>
                <RotateCcw className="size-5" aria-hidden /> Repetir las frases
              </button>
            </div>
          </div>
        ) : (
          <div key={i} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 pm-rise">
            <p className="text-sm font-extrabold uppercase tracking-widest text-speak">Habla · repite como nativo</p>
            <div className="flex flex-col items-center gap-3 rounded-[28px] bg-white p-6 text-center">
              <div className="flex gap-2">
                <button type="button" onClick={() => speak(line.en)} className="flex items-center gap-1.5 rounded-full bg-listen px-4 py-2 text-sm font-extrabold text-white">
                  <Volume2 className="size-4" aria-hidden /> Escuchar
                </button>
                <button type="button" onClick={() => speak(line.en, true)} className="flex items-center gap-1.5 rounded-full bg-[#e6f1f8] px-4 py-2 text-sm font-extrabold text-listen">
                  <Snail className="size-4" aria-hidden /> Lento
                </button>
              </div>
              <p className="font-display text-[26px] font-extrabold leading-snug">
                {result
                  ? result.words.map((w, k) => (
                      <span key={k} className={w.ok ? "text-[#15803d]" : "text-[#dc2626] underline decoration-wavy underline-offset-4"}>
                        {w.word}{" "}
                      </span>
                    ))
                  : line.en}
              </p>
              <p className="text-sm text-muted">{line.es}</p>
            </div>

            {mic.state === "listening" && mic.interim && (
              <p className="rounded-2xl bg-white/70 px-4 py-3 text-center italic text-muted">“{mic.interim}”</p>
            )}
            {result && (
              <div className={`flex items-center gap-4 rounded-2xl px-4 py-3 pm-rise ${result.pass ? "bg-[#dcfce7] text-[#14532d]" : "bg-[#fff4d6] text-[#5c3d00]"}`}>
                <span className="font-display text-3xl font-black">{result.pct}%</span>
                <div className="text-sm">
                  <p className="font-extrabold">{result.pass ? "¡Muy bien! Se te entiende." : "¡Casi! Inténtalo otra vez."}</p>
                  {result.tip && <p>{result.tip}</p>}
                  <p className="mt-0.5 opacity-75">Entendí: “{heard}”</p>
                </div>
              </div>
            )}
            {mic.error && <p role="alert" className="rounded-2xl bg-[#fde2e2] px-4 py-3 text-sm text-[#7f1d1d]">{mic.error}</p>}
            {mic.mode === "none" && (
              <p className="rounded-2xl bg-[#fde2e2] px-4 py-3 text-sm text-[#7f1d1d]">
                Este navegador no permite usar el micrófono. Abre la app en Safari (iPhone) o Chrome.
              </p>
            )}

            <div className="flex-1" />
            {mic.mode !== "none" && <MicButton state={mic.state} mode={mic.mode} onPress={attempt} />}
            {result && (
              <button type="button" className={`${btn} bg-ink text-white`} onClick={next}>
                {i + 1 === lines.length ? "Terminar" : "Siguiente frase"} <ArrowRight className="size-5" aria-hidden />
              </button>
            )}
            {!result && (
              <button
                type="button"
                onClick={() => {
                  mic.stop();
                  next();
                }}
                className="mx-auto px-4 py-1 text-sm font-bold text-muted underline-offset-4 hover:underline"
              >
                {i + 1 === lines.length ? "Saltar y terminar" : "Saltar esta frase"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
