"use client";
// components/speak/use-speech-input.ts
// Micrófono → texto. Vía principal: reconocimiento de voz del navegador (en iPhone usa el de Apple, $0).
// Protección contra la falla conocida de iOS (el micrófono "se cuelga" sin avisar): reconocedor NUEVO en cada turno
// + vigilante que lo corta si no responde. Si falla 2 veces seguidas, cambia al PLAN B: grabar y transcribir con
// OpenAI (/api/transcribe, ≈ $0.003/min con la key del usuario). Sin micrófono: el usuario puede escribir.
import { useCallback, useEffect, useRef, useState } from "react";
import { stopSpeech } from "@/components/lesson/speech";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function canRecord() {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export type MicMode = "browser" | "cloud" | "none";
export type MicState = "idle" | "listening" | "processing";

const START_TIMEOUT = 4000; // si no arranca en 4 s, se considera colgado
const SILENCE_TIMEOUT = 9000; // si no oye nada en 9 s, se corta
const MAX_CLOUD_MS = 30000;

export function useSpeechInput() {
  const [mode, setMode] = useState<MicMode>("browser");
  const [state, setState] = useState<MicState>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fails = useRef(0);
  const stopRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!recognitionCtor()) setMode(canRecord() ? "cloud" : "none");
    return () => stopRef.current();
  }, []);

  const failed = useCallback(() => {
    fails.current += 1;
    if (fails.current >= 2 && canRecord()) {
      setMode("cloud");
      setError("El micrófono del navegador no respondió. Cambié al modo grabar: toca para empezar y toca otra vez para terminar.");
    } else {
      setError("No te pude escuchar. Toca el micrófono e intenta de nuevo.");
    }
  }, []);

  const listenBrowser = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        const Ctor = recognitionCtor();
        if (!Ctor) return resolve(null);
        const rec = new Ctor(); // nuevo en cada turno (evita el bloqueo de iOS)
        rec.lang = "en-US";
        rec.interimResults = true;
        rec.continuous = false;
        rec.maxAlternatives = 1;
        let finalText = "";
        let lastInterim = "";
        let started = false;
        let heard = false;
        let done = false;
        const finish = (text: string | null, failure = false) => {
          if (done) return;
          done = true;
          clearTimeout(startTimer);
          clearTimeout(silenceTimer);
          setState("idle");
          setInterim("");
          if (failure) failed();
          else if (text) fails.current = 0;
          resolve(text);
        };
        const startTimer = setTimeout(() => {
          if (!started) {
            try { rec.abort(); } catch {}
            finish(null, true);
          }
        }, START_TIMEOUT);
        const silenceTimer = setTimeout(() => {
          if (!heard) {
            try { rec.abort(); } catch {}
            setError("No te escuché. Toca el micrófono y habla de nuevo.");
            finish(null);
          }
        }, SILENCE_TIMEOUT);
        rec.onstart = () => {
          started = true;
        };
        rec.onresult = (e) => {
          heard = true;
          let text = "";
          let finals = "";
          for (let i = 0; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finals += ` ${r[0].transcript}`;
            else text += r[0].transcript;
          }
          finalText = finals.trim();
          lastInterim = text;
          setInterim(`${finalText} ${text}`.trim());
        };
        rec.onerror = (e) => {
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            setError("Permite el micrófono: Ajustes del iPhone → Safari → Micrófono → Permitir. Luego vuelve a intentar.");
            finish(null);
          } else if (e.error === "no-speech" || e.error === "aborted") {
            if (e.error === "no-speech") setError("No te escuché. Toca el micrófono y habla de nuevo.");
            finish(null);
          } else finish(null, true);
        };
        rec.onend = () => finish(`${finalText} ${lastInterim}`.trim() || null);
        stopRef.current = () => {
          try { rec.stop(); } catch {}
        };
        setError(null);
        setState("listening");
        try {
          rec.start();
        } catch {
          finish(null, true);
        }
      }),
    [failed],
  );

  const listenCloud = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        let stream: MediaStream | null = null;
        const run = async () => {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            setError("Permite el micrófono: Ajustes del iPhone → Safari → Micrófono → Permitir.");
            return resolve(null);
          }
          const type = ["audio/mp4", "audio/webm", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? "";
          const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
          const timer = setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_CLOUD_MS);
          recorder.onstop = async () => {
            clearTimeout(timer);
            stream?.getTracks().forEach((t) => t.stop());
            setState("processing");
            try {
              const blob = new Blob(chunks, { type: recorder.mimeType || "audio/mp4" });
              const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("ogg") ? "ogg" : "m4a";
              const form = new FormData();
              form.append("audio", blob, `voice.${ext}`);
              const res = await fetch("/api/transcribe", { method: "POST", body: form });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(body.error ?? "No se pudo transcribir. Intenta de nuevo o escribe tu respuesta.");
                resolve(null);
              } else resolve((body.text as string) || null);
            } catch {
              setError("Sin conexión. Intenta de nuevo.");
              resolve(null);
            } finally {
              setState("idle");
            }
          };
          stopRef.current = () => recorder.state === "recording" && recorder.stop();
          setError(null);
          setState("listening");
          recorder.start();
        };
        void run();
      }),
    [],
  );

  // Escuchar una respuesta. Se llama desde un toque del usuario.
  const listen = useCallback(async () => {
    stopSpeech(); // nunca escuchar mientras Mike habla
    if (mode === "browser") return listenBrowser();
    if (mode === "cloud") return listenCloud();
    return null;
  }, [mode, listenBrowser, listenCloud]);

  const stop = useCallback(() => stopRef.current(), []);

  return { mode, state, interim, error, setError, listen, stop };
}
