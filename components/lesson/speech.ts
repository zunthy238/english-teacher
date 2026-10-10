// components/lesson/speech.ts
// Voz en inglés americano del navegador (Web Speech API, $0). Debe llamarse desde un toque del usuario (iPhone).
// Consejo para el iPhone: Ajustes → Accesibilidad → Contenido leído → Voces → Inglés: descargar voces "Mejorada"/"Premium"
// (p. ej. Ava, Evan, Zoe, Nathan). La app las elige automáticamente si existen.

const PREFERRED = /premium|enhanced|mejorada|natural|neural|google|samantha|aria|jenny|ava|evan|zoe|nathan/i;
const FEMALE = /samantha|ava|allison|susan|zoe|nicky|joelle|jenny|aria|karen|moira|tessa|victoria|serena|female|michelle|emma/i;
const MALE = /alex|tom|evan|aaron|fred|nathan|guy|davis|daniel|rishi|male|christopher|eric|andrew|brian/i;

function synth() {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

function englishVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  const all = s.getVoices().filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("en-us"));
  return [...all].sort((a, b) => Number(PREFERRED.test(b.name)) - Number(PREFERRED.test(a.name)));
}

export function stopSpeech() {
  synth()?.cancel();
}

export function speak(text: string, slow = false) {
  const s = synth();
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = slow ? 0.8 : 0.95;
  const voice = englishVoices()[0];
  if (voice) u.voice = voice;
  s.speak(u);
}

// Elige una voz por personaje (mujer / hombre). Si el equipo solo tiene una voz, cambia el tono para distinguirlos.
function voiceFor(gender: "female" | "male", taken?: SpeechSynthesisVoice) {
  const voices = englishVoices();
  const byGender = voices.filter((v) => (gender === "female" ? FEMALE : MALE).test(v.name) && v !== taken);
  return byGender[0] ?? voices.find((v) => v !== taken) ?? voices[0];
}

export type SpokenLine = { text: string; gender: "female" | "male"; speaker: number };

// Reproduce varias líneas seguidas (encoladas en el mismo toque: funciona en iPhone).
// onLine(i) avisa qué línea suena para iluminarla. Devuelve una función para detener.
export function speakLines(
  lines: SpokenLine[],
  opts: { slow?: boolean; onLine?: (i: number) => void; onEnd?: () => void } = {},
): () => void {
  const s = synth();
  if (!s || lines.length === 0) {
    opts.onEnd?.();
    return () => undefined;
  }
  s.cancel();
  const first = lines[0];
  const v0 = voiceFor(first.gender);
  const other = lines.find((l) => l.speaker !== first.speaker);
  const v1 = other ? voiceFor(other.gender, v0) : v0;
  let stopped = false;
  lines.forEach((line, i) => {
    const u = new SpeechSynthesisUtterance(line.text);
    u.lang = "en-US";
    u.rate = opts.slow ? 0.75 : 0.95;
    const voice = line.speaker === first.speaker ? v0 : v1;
    if (voice) u.voice = voice;
    if (v0 === v1 && line.speaker !== first.speaker) u.pitch = line.gender === "male" ? 0.8 : 1.25;
    u.onstart = () => !stopped && opts.onLine?.(i);
    if (i === lines.length - 1) {
      u.onend = () => !stopped && opts.onEnd?.();
      u.onerror = () => !stopped && opts.onEnd?.();
    }
    s.speak(u);
  });
  return () => {
    stopped = true;
    s.cancel();
  };
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // iPhone no soporta vibración web: se ignora
  }
}
