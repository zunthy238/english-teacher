"use client";
// components/speak/mic-button.tsx — botón grande de micrófono (anillos cuando escucha)
import { Loader2, Mic, Square } from "lucide-react";
import type { MicMode, MicState } from "./use-speech-input";

export function MicButton({
  state,
  mode,
  onPress,
  dark = false,
}: {
  state: MicState;
  mode: MicMode;
  onPress: () => void;
  dark?: boolean;
}) {
  const listening = state === "listening";
  const label =
    state === "processing"
      ? "Transcribiendo…"
      : listening
        ? mode === "cloud"
          ? "Grabando… toca para terminar"
          : "Escuchando… habla con calma"
        : mode === "cloud"
          ? "Toca para grabar"
          : "Toca y habla · se detiene solo";
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onPress}
        disabled={state === "processing"}
        aria-label={listening ? "Detener" : "Hablar"}
        className={`relative flex size-24 items-center justify-center rounded-full bg-speak text-white transition-transform active:scale-95 ${
          listening ? "shadow-[0_0_0_12px_rgba(217,58,64,0.28),0_0_0_26px_rgba(217,58,64,0.12)]" : "shadow-[0_0_0_10px_rgba(217,58,64,0.14)]"
        }`}
      >
        {listening && <span className="absolute inset-0 animate-ping rounded-full bg-speak/40" aria-hidden />}
        {state === "processing" ? (
          <Loader2 className="size-10 animate-spin" aria-hidden />
        ) : listening && mode === "cloud" ? (
          <Square className="size-9 fill-current" aria-hidden />
        ) : (
          <Mic className="relative size-10" aria-hidden strokeWidth={2.2} />
        )}
      </button>
      <p className={`text-sm font-semibold ${dark ? "text-[#b9bce6]" : "text-muted"}`} aria-live="polite">
        {label}
      </p>
    </div>
  );
}
