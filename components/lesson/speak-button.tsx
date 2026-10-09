// components/lesson/speak-button.tsx
// Botón 🔊: lee en voz alta con la voz en inglés americano del navegador (Web Speech API, $0).
"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "en-US" && /natural|neural|google|samantha|aria|jenny/i.test(v.name)) ??
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en"))
  );
}

export function SpeakButton({ text, slow = false, label }: { text: string; slow?: boolean; label?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    setSupported(true);
    window.speechSynthesis.getVoices(); // algunos navegadores cargan las voces de forma diferida
  }, []);

  if (!supported) return null;

  function speak() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = slow ? 0.8 : 0.95;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={label ?? `Escuchar: ${text}`}
      title="Escuchar"
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
        speaking
          ? "bg-blue-600 text-white"
          : "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
      }`}
    >
      <Volume2 className="size-4" aria-hidden />
    </button>
  );
}
