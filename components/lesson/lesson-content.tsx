// components/lesson/lesson-content.tsx
// Parte de lectura de la lección: encabezado, explicación, ejemplos y vocabulario.
import type { Lesson } from "@/lib/schemas/lesson";
import { SpeakButton } from "./speak-button";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </h2>
  );
}

const card =
  "rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

export function LessonContent({ lesson }: { lesson: Lesson }) {
  // En A1-A2 la voz va más despacio
  const slow = lesson.cefr_level === "A1" || lesson.cefr_level === "A2";
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {lesson.cefr_level}
          </span>
          <span className="text-zinc-500">Lección del día</span>
        </div>
        <h1 className="text-2xl font-semibold leading-tight md:text-3xl">
          {lesson.title}
        </h1>
      </header>

      <section>
        <SectionTitle>Explicación</SectionTitle>
        <div className={`${card} p-5`}>
          <p className="whitespace-pre-line leading-relaxed">{lesson.explanation_es}</p>
        </div>
      </section>

      <section>
        <SectionTitle>Ejemplos</SectionTitle>
        <ul className={`${card} divide-y divide-zinc-200 dark:divide-zinc-800`}>
          {lesson.examples.map((ex) => (
            <li key={ex.en} className="flex items-start gap-3 px-5 py-3">
              <SpeakButton text={ex.en} slow={slow} />
              <div className="pt-1">
                <p className="font-medium">{ex.en}</p>
                {ex.es && <p className="text-sm text-zinc-500">{ex.es}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>Vocabulario</SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2">
          {lesson.vocabulary.map((v) => (
            <li key={v.word} className={`${card} p-4`}>
              <div className="flex items-center gap-2">
                <SpeakButton text={v.word} slow label={`Escuchar la palabra ${v.word}`} />
                <p className="font-semibold">
                  {v.word}{" "}
                  <span className="font-normal text-zinc-500">· {v.meaning_es}</span>
                </p>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <SpeakButton text={v.example} slow={slow} label={`Escuchar el ejemplo de ${v.word}`} />
                <p className="text-sm italic text-zinc-600 dark:text-zinc-400">{v.example}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}