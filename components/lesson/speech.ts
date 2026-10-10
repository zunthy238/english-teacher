// components/lesson/speech.ts
// Voz en inglés americano del navegador (Web Speech API, $0). Debe llamarse desde un toque del usuario (iPhone).
export function speak(text: string, slow = false) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = slow ? 0.8 : 0.95;
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => v.lang === "en-US" && /natural|neural|google|samantha|aria|jenny/i.test(v.name)) ??
    voices.find((v) => v.lang === "en-US");
  if (voice) u.voice = voice;
  synth.speak(u);
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // iPhone no soporta vibración web: se ignora
  }
}
