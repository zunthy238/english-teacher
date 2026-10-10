"use client";
// components/speak/talk-flow.tsx
// "Conversa con Professor Mike": roleplay por voz de 6 turnos. Mike no interrumpe para corregir:
// la retroalimentación llega al final (2-3 correcciones + una frase de oro que entra al repaso).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Keyboard, Lightbulb, Loader2, Mic, RotateCcw, Send, Star, Volume2, X } from "lucide-react";
import { fillJob, TURNS, type Scenario } from "@/lib/speak/scenarios";
import type { ChatMessage, Feedback } from "@/lib/speak/roleplay";
import { speak, stopSpeech, vibrate } from "@/components/lesson/speech";
import { useSpeechInput } from "./use-speech-input";
import { MicButton } from "./mic-button";

type Phase = "intro" | "chat" | "thinking" | "finished" | "feedback" | "result";
const KEY_CODES = ["no_key", "key_rejected", "provider_limit"];
const btn =
  "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40";

export function TalkFlow({ scenario, jobTitle, onExit }: { scenario: Scenario; jobTitle: string | null; onExit: () => void }) {
  const mic = useSpeechInput();
  const [phase, setPhase] = useState<Phase>("intro");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "mike", text: scenario.opening }]);
  const [hint, setHint] = useState<string | null>(scenario.first_hint);
  const [showHint, setShowHint] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [result, setResult] = useState<Feedback | null>(null);
  const startedAt = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const title = fillJob(scenario.title, jobTitle).replace(" – professional", "");
  const turns = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, phase]);
  useEffect(() => () => stopSpeech(), []);

  function begin() {
    startedAt.current = Date.now();
    setPhase("chat");
    speak(scenario.opening); // primer audio dentro del toque: desbloquea la voz en iPhone
  }

  async function record() {
    if (mic.state === "listening") return mic.stop();
    setShowHint(false);
    const text = await mic.listen();
    if (text) setPending(text);
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const next: ChatMessage[] = [...messages, { role: "user", text: clean }];
    setMessages(next);
    setPending(null);
    setDraft("");
    setTyping(false);
    setShowHint(false);
    await askMike(next);
  }

  async function askMike(history: ChatMessage[]) {
    setError(null);
    setPhase("thinking");
    try {
      const res = await fetch("/api/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_id: scenario.id, messages: history }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: body.error ?? "Mike no pudo responder.", code: body.code ?? "unknown" });
        setPhase("chat");
        return;
      }
      setMessages([...history, { role: "mike", text: body.reply }]);
      setHint(body.hint ?? null);
      speak(body.reply);
      vibrate(15);
      setPhase(body.done ? "finished" : "chat");
    } catch {
      setError({ message: "Sin conexión. Revisa tu internet.", code: "network" });
      setPhase("chat");
    }
  }

  async function getFeedback() {
    stopSpeech();
    setError(null);
    setPhase("feedback");
    try {
      const res = await fetch("/api/roleplay/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: scenario.id,
          messages,
          minutes: (Date.now() - startedAt.current) / 60000,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: body.error ?? "No se pudo preparar tu resultado.", code: body.code ?? "unknown" });
        setPhase("finished");
        return;
      }
      const fb = body.feedback as Feedback;
      setResult(fb);
      setPhase("result");
      // La frase de oro y las correcciones entran al repaso espaciado
      void fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_key: `${body.level ?? "A1"}_speaking`,
          cards: [
            { kind: "phrase", front: fb.golden_phrase.en, back: fb.golden_phrase.es, extra: null, error_type: null },
            ...fb.corrections.map((c) => ({
              kind: "error",
              front: c.right,
              back: "Forma correcta",
              extra: `No digas: ${c.wrong}`,
              error_type: c.error_type,
            })),
          ],
        }),
      }).catch(() => undefined);
    } catch {
      setError({ message: "Sin conexión. Revisa tu internet.", code: "network" });
      setPhase("finished");
    }
  }

  function restart() {
    stopSpeech();
    setMessages([{ role: "mike", text: scenario.opening }]);
    setHint(scenario.first_hint);
    setResult(null);
    setPending(null);
    setError(null);
    setPhase("intro");
  }

  const exit = () => {
    mic.stop();
    stopSpeech();
    onExit();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink text-white">
      <div className="mx-auto flex h-full w-full max-w-xl flex-col">
        <div className="flex items-center gap-3 px-5 pb-2 pt-[max(16px,env(safe-area-inset-top))]">
          <button type="button" onClick={exit} aria-label="Salir" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ink">
            <X className="size-5" aria-hidden strokeWidth={2.6} />
          </button>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#2e3166]">
            <div className="h-full rounded-full bg-speak transition-all duration-500" style={{ width: `${(Math.min(turns, TURNS) / TURNS) * 100}%` }} />
          </div>
          <span className="w-12 text-right text-sm font-bold text-[#b9bce6]">{Math.min(turns, TURNS)}/{TURNS}</span>
        </div>

        {/* INTRO */}
        {phase === "intro" && (
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 pm-rise">
            <div className="flex flex-1 flex-col justify-center gap-4">
              <span className="text-6xl" aria-hidden>{scenario.emoji}</span>
              <h1 className="font-display text-[32px] font-extrabold leading-tight">{title}</h1>
              <p className="rounded-2xl bg-ink-soft px-4 py-3">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#fca5a5]">Tu meta</span>
                <br />
                {scenario.goal_es}
              </p>
              <ul className="space-y-2 text-[15px] text-[#d6d8f5]">
                <li>🎤 Toca el micrófono, habla y revisa lo que entendí antes de enviarlo.</li>
                <li>💡 Si te bloqueas, toca <b>¿Qué digo?</b> para ver un ejemplo.</li>
                <li>✅ Mike no te interrumpe: al final te muestra qué mejorar.</li>
              </ul>
              <p className="text-xs text-[#b9bce6]">{TURNS} turnos · usa ~{TURNS + 1} solicitudes de tu cuota diaria</p>
            </div>
            <button type="button" className={`${btn} bg-speak text-white`} onClick={begin}>
              Empezar la conversación <ArrowRight className="size-5" aria-hidden />
            </button>
          </div>
        )}

        {/* CONVERSACIÓN */}
        {(phase === "chat" || phase === "thinking" || phase === "finished" || phase === "feedback") && (
          <>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-3 pt-2">
              <div className="rounded-2xl bg-ink-soft px-4 py-3 text-sm">
                <span className="font-extrabold">{scenario.emoji} {title}</span>
                <span className="block text-[#b9bce6]">Meta: {scenario.goal_es}</span>
              </div>
              {messages.map((m, k) =>
                m.role === "mike" ? (
                  <div key={k} className="flex max-w-[85%] items-start gap-2 self-start rounded-[20px] rounded-bl-md bg-white px-4 py-3 text-[16px] text-ink pm-rise">
                    <span className="flex-1">{m.text}</span>
                    <button type="button" onClick={() => speak(m.text)} aria-label="Escuchar" className="shrink-0 text-listen">
                      <Volume2 className="size-5" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <div key={k} className="max-w-[85%] self-end rounded-[20px] rounded-br-md bg-speak px-4 py-3 text-[16px] pm-rise">{m.text}</div>
                ),
              )}
              {phase === "thinking" && (
                <div className="flex items-center gap-2 self-start rounded-[20px] bg-white/10 px-4 py-3 text-sm text-[#b9bce6]">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Mike está respondiendo…
                </div>
              )}
              {mic.state === "listening" && mic.interim && (
                <div className="max-w-[85%] self-end rounded-[20px] border-2 border-dashed border-speak px-4 py-3 italic text-[#d6d8f5]">{mic.interim}</div>
              )}
              {pending && (
                <div className="flex max-w-[90%] flex-col gap-2 self-end rounded-[20px] border-2 border-dashed border-speak bg-speak/15 px-4 py-3 pm-rise">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#fca5a5]">Entendí esto</p>
                  <p className="text-[16px]">{pending}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => send(pending)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-speak py-2.5 font-extrabold">
                      <Send className="size-4" aria-hidden /> Enviar
                    </button>
                    <button type="button" onClick={() => { setPending(null); void record(); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2.5 font-bold">
                      <Mic className="size-4" aria-hidden /> Otra vez
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <div role="alert" className="rounded-2xl bg-[#fde2e2] px-4 py-3 text-sm text-[#7f1d1d]">
                  {error.message}
                  <div className="mt-2 flex gap-3 font-bold">
                    {KEY_CODES.includes(error.code) ? (
                      <Link href="/settings" className="underline">Ir a Ajustes</Link>
                    ) : error.code !== "quota" ? (
                      <button type="button" className="underline" onClick={() => (phase === "finished" ? getFeedback() : askMike(messages))}>
                        Intentar de nuevo
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
              {mic.error && !pending && <p role="alert" className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-[#fde68a]">{mic.error}</p>}
              <div ref={bottom} />
            </div>

            <div className="space-y-3 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-2">
              {phase === "finished" || phase === "feedback" ? (
                <button type="button" className={`${btn} bg-brand-soft text-ink`} onClick={getFeedback} disabled={phase === "feedback"}>
                  {phase === "feedback" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
                  {phase === "feedback" ? "Preparando tu resultado…" : "Ver mi resultado"}
                </button>
              ) : (
                <>
                  {showHint && hint && (
                    <div className="flex items-start gap-2 rounded-2xl bg-learn px-4 py-3 text-ink pm-rise">
                      <span className="flex-1 text-[15px] font-semibold">“{hint}”</span>
                      <button type="button" onClick={() => speak(hint)} aria-label="Escuchar ejemplo" className="shrink-0">
                        <Volume2 className="size-5" aria-hidden />
                      </button>
                    </div>
                  )}
                  {typing || mic.mode === "none" ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void send(draft);
                      }}
                    >
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        maxLength={400}
                        placeholder="Escribe tu respuesta en inglés…"
                        aria-label="Tu respuesta"
                        className="min-h-[52px] flex-1 rounded-2xl bg-white px-4 text-ink outline-none"
                      />
                      <button type="submit" disabled={!draft.trim() || phase === "thinking"} className="flex size-[52px] items-center justify-center rounded-2xl bg-speak disabled:opacity-40" aria-label="Enviar">
                        <Send className="size-5" aria-hidden />
                      </button>
                    </form>
                  ) : (
                    !pending && phase === "chat" && <MicButton state={mic.state} mode={mic.mode} onPress={record} dark />
                  )}
                  <div className="flex justify-center gap-3">
                    {hint && (
                      <button type="button" onClick={() => setShowHint((s) => !s)} className="flex items-center gap-1.5 rounded-full bg-learn px-4 py-2 text-sm font-extrabold text-ink">
                        <Lightbulb className="size-4" aria-hidden /> ¿Qué digo?
                      </button>
                    )}
                    {mic.mode !== "none" && (
                      <button type="button" onClick={() => setTyping((t) => !t)} className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
                        {typing ? <Mic className="size-4" aria-hidden /> : <Keyboard className="size-4" aria-hidden />}
                        {typing ? "Hablar" : "Escribir"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* RESULTADO */}
        {phase === "result" && result && (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
            <div className="flex flex-col items-center gap-2 text-center pm-pop">
              <span className="text-5xl" aria-hidden>🎉</span>
              <h2 className="font-display text-3xl font-extrabold">¡Conversación completa!</h2>
              <p className="text-[#b9bce6]">Te hiciste entender en {result.understood} de {result.turns} turnos</p>
              <p className="rounded-full bg-ink-soft px-4 py-1.5 text-sm font-bold">👏 {result.praise_es}</p>
            </div>
            {result.corrections.length > 0 ? (
              <>
                <p className="text-xs font-extrabold uppercase tracking-widest text-[#b9bce6]">Mejora esto</p>
                {result.corrections.map((c, k) => (
                  <div key={k} className="flex items-start gap-3 rounded-2xl bg-ink-soft px-4 py-3 pm-rise">
                    <div className="flex-1 text-[15px]">
                      <p>
                        <s className="text-[#fca5a5]">{c.wrong}</s> → <b className="text-[#86efac]">{c.right}</b>
                      </p>
                      <p className="mt-0.5 text-sm text-[#b9bce6]">{c.why_es}</p>
                    </div>
                    <button type="button" onClick={() => speak(c.right)} aria-label="Escuchar la forma correcta" className="shrink-0 text-[#86efac]">
                      <Volume2 className="size-5" aria-hidden />
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <p className="rounded-2xl bg-ink-soft px-4 py-3">✅ No encontré errores importantes. ¡Excelente!</p>
            )}
            <div className="flex items-start gap-3 rounded-2xl bg-[#ddf5ef] px-4 py-3 text-[#0b5148]">
              <div className="flex-1">
                <p className="text-xs font-extrabold uppercase tracking-widest">Frase de oro</p>
                <p className="mt-1 text-[16px] font-bold">“{result.golden_phrase.en}”</p>
                <p className="text-sm">{result.golden_phrase.es}</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-bold">
                  <Star className="size-3.5 fill-current" aria-hidden /> Guardada en tu repaso
                </p>
              </div>
              <button type="button" onClick={() => speak(result.golden_phrase.en)} aria-label="Escuchar la frase de oro" className="shrink-0">
                <Volume2 className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1" />
            <button type="button" className={`${btn} bg-brand-soft text-ink`} onClick={restart}>
              <RotateCcw className="size-5" aria-hidden /> Practicar otra vez
            </button>
            <button type="button" className={`${btn} bg-ink-soft text-white`} onClick={exit}>
              Otro escenario
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
