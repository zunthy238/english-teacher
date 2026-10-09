// components/lesson/lesson-content.tsx
// Parte de lectura de la lección: encabezado, explicación, ejemplos y vocabulario.
import type { Lesson } from "@/lib/schemas/lesson";

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
          <p className="leading-relaxed">{lesson.explanation_es}</p>
        </div>
      </section>

      <section>
        <SectionTitle>Ejemplos</SectionTitle>
        <ul className={`${card} divide-y divide-zinc-200 dark:divide-zinc-800`}>
          {lesson.examples.map((ex) => (
            <li key={ex.en} className="px-5 py-3">
              <p className="font-medium">{ex.en}</p>
              {ex.es && <p className="text-sm text-zinc-500">{ex.es}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>Vocabulario</SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2">
          {lesson.vocabulary.map((v) => (
            <li key={v.word} className={`${card} p-4`}>
              <p className="font-semibold">
                {v.word}{" "}
                <span className="font-normal text-zinc-500">· {v.meaning_es}</span>
              </p>
              <p className="mt-1 text-sm italic text-zinc-600 dark:text-zinc-400">
                {v.example}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}