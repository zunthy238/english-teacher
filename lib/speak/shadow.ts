// lib/speak/shadow.ts
// "Repite como nativo": elige frases y califica lo que el reconocimiento de voz entendió (funciones puras, probadas).
import { diffDictation, wordCount } from "../story-validate";
import type { CefrLevel } from "../schemas/lesson";
import type { Story } from "../schemas/story";

export type ShadowLine = { en: string; es: string };
export const PASS_PCT = 80;

// Frases cortas de la historia (4-14 palabras), sin repetir, máximo 5
export function pickShadowLines(story: Story, max = 5): ShadowLine[] {
  const seen = new Set<string>();
  return story.lines
    .filter((l) => {
      const n = wordCount(l.en);
      const key = l.en.toLowerCase();
      if (n < 4 || n > 14 || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max)
    .map((l) => ({ en: l.en, es: l.es }));
}

// Si todavía no hay historias en caché: frases útiles por nivel
export const FALLBACK_LINES: Record<CefrLevel, ShadowLine[]> = {
  A1: [
    { en: "Hi, my name is Ana. Nice to meet you.", es: "Hola, me llamo Ana. Mucho gusto." },
    { en: "I'm from Colombia and I live in Bogotá.", es: "Soy de Colombia y vivo en Bogotá." },
    { en: "Can I have a coffee, please?", es: "¿Me da un café, por favor?" },
    { en: "Where's the bathroom?", es: "¿Dónde está el baño?" },
    { en: "I don't understand. Can you repeat that?", es: "No entiendo. ¿Puede repetirlo?" },
  ],
  A2: [
    { en: "I went to the supermarket yesterday.", es: "Fui al supermercado ayer." },
    { en: "I'm going to visit my family next weekend.", es: "Voy a visitar a mi familia el próximo fin de semana." },
    { en: "Could you speak a little slower, please?", es: "¿Podría hablar un poco más despacio, por favor?" },
    { en: "How much does this jacket cost?", es: "¿Cuánto cuesta esta chaqueta?" },
    { en: "I usually work from nine to five.", es: "Normalmente trabajo de nueve a cinco." },
  ],
  B1: [
    { en: "I've been working here for three years.", es: "He trabajado aquí durante tres años." },
    { en: "If I have time tomorrow, I'll call you.", es: "Si tengo tiempo mañana, te llamo." },
    { en: "Sorry, my train was delayed this morning.", es: "Perdón, mi tren se retrasó esta mañana." },
    { en: "Could you send me the report by Friday?", es: "¿Me podrías enviar el informe para el viernes?" },
    { en: "I'm looking forward to working with you.", es: "Espero con gusto trabajar contigo." },
  ],
  B2: [
    { en: "If I'd known about the meeting, I would've joined.", es: "Si hubiera sabido de la reunión, me habría unido." },
    { en: "We need to figure out a better solution.", es: "Necesitamos encontrar una mejor solución." },
    { en: "That's a great point, but I see it differently.", es: "Es un gran punto, pero lo veo diferente." },
    { en: "I'd rather schedule the call for next week.", es: "Preferiría programar la llamada para la próxima semana." },
    { en: "It cut our processing time by half.", es: "Redujo nuestro tiempo de procesamiento a la mitad." },
  ],
  C1: [
    { en: "Given the circumstances, we handled it pretty well.", es: "Dadas las circunstancias, lo manejamos bastante bien." },
    { en: "It's not that the idea lacks merit.", es: "No es que la idea no tenga mérito." },
    { en: "We don't have the bandwidth to take it on right now.", es: "No tenemos la capacidad para asumirlo ahora mismo." },
    { en: "I'd be surprised if the numbers turned out any better.", es: "Me sorprendería que las cifras salieran mejores." },
    { en: "Let's circle back to this once we have more data.", es: "Retomemos esto cuando tengamos más datos." },
  ],
};

export function tipFor(word: string): string {
  const w = word.replace(/[^a-zA-Z']/g, "");
  const lower = w.toLowerCase();
  if (lower.includes("'")) return `Une la contracción en un solo sonido: "${w}".`;
  if (/ed$/.test(lower) && lower.length > 3) return `Pronuncia la "-ed" final de "${w}" (suena /d/, /t/ o /id/).`;
  if (/^th/.test(lower)) return `En "${w}" pon la lengua entre los dientes para la "th".`;
  if (/[^s]s$/.test(lower) && lower.length > 3) return `No olvides la "s" final de "${w}".`;
  if (/^(v|b)/.test(lower)) return `Cuida la "${lower[0]}" de "${w}": en inglés la "v" se hace con los dientes en el labio.`;
  return `Repite "${w}" despacio y luego a velocidad normal.`;
}

export function scoreShadow(expected: string, heard: string) {
  const words = diffDictation(expected, heard);
  const ok = words.filter((w) => w.ok).length;
  const pct = words.length ? Math.round((ok / words.length) * 100) : 0;
  const missed = words.find((w) => !w.ok);
  return {
    words,
    pct,
    pass: pct >= PASS_PCT,
    tip: missed ? tipFor(missed.word) : null,
  };
}
