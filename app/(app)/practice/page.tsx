// app/(app)/practice/page.tsx
// Hablar: conversación por voz y roleplays (Fase D / CP-5).
import { Mic } from "lucide-react";

export default function PracticePage() {
  return (
    <div className="space-y-6 pm-rise">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-speak">Hablar</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">Conversa con Professor Mike</h1>
      </header>
      <section className="flex flex-col items-center gap-4 rounded-[28px] bg-white px-6 py-10 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-speak text-white">
          <Mic className="size-9" aria-hidden strokeWidth={2} />
        </span>
        <p className="font-display text-xl font-bold">Muy pronto podrás hablar en inglés aquí</p>
        <p className="max-w-sm text-muted">
          Repetir frases con puntaje de pronunciación, conversaciones guiadas y simulacros de entrevista para
          desarrolladores Power Apps.
        </p>
      </section>
    </div>
  );
}
