// components/lesson/today-view.tsx
// Une lectura + ejercicios. El selector de lecciones es temporal (CP-0.5);
// en CP-3 /api/lesson decide la lección del día.
"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/schemas/lesson";
import { LessonContent } from "./lesson-content";
import { ExercisesForm } from "./exercises-form";

export function TodayView({ lessons }: { lessons: Lesson[] }) {
  const [index, setIndex] = useState(0);
  const lesson = lessons[index];

  function choose(i: number) {
    setIndex(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-10">
      {lessons.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {lessons.map((l, i) => (
            <button
              key={l.topic_key}
              type="button"
              onClick={() => choose(i)}
              aria-pressed={i === index}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                i === index
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              Lección {i + 1}
            </button>
          ))}
        </div>
      )}
      <LessonContent lesson={lesson} />
      {/* key: al cambiar de lección, los ejercicios empiezan en blanco */}
      <ExercisesForm key={lesson.topic_key} exercises={lesson.exercises} />
    </div>
  );
}