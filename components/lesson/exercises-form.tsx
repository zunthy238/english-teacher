// components/lesson/exercises-form.tsx
// Ejercicios de la lección. Los cerrados se califican en el dispositivo (lib/grade.ts), sin API.
"use client";

import { useRef, useState } from "react";
import { PenLine, Mic } from "lucide-react";
import type {
  ClosedExercise,
  Exercise,
  FillBlankExercise,
  MultipleChoiceExercise,
  OpenExercise,
  WordOrderExercise,
} from "@/lib/schemas/lesson";
import { isClosedExercise } from "@/lib/schemas/lesson";
import { gradeLesson, type LessonGrade } from "@/lib/grade";
import { SpeakButton } from "./speak-button";

// Frase completa y correcta, para escucharla después de calificar
function correctSentence(ex: ClosedExercise): string {
  if (ex.type === "word_order") return ex.answer;
  return ex.prompt.includes("___") ? ex.prompt.replace("___", ex.answer).replace(/\s*\([^)]*\)/g, "") : ex.answer;
}

const LABELS: Record<ClosedExercise["type"], string> = {
  multiple_choice: "Elige la opción correcta",
  fill_blank: "Completa el espacio",
  word_order: "Ordena las palabras",
};

const chip =
  "rounded-lg border px-3 py-2 text-base font-medium transition-colors disabled:cursor-default";
const primary =
  "w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
const sectionTitle = "text-xs font-semibold uppercase tracking-wider text-zinc-500";

type InputProps<T> = {
  ex: T;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
};

function MultipleChoice({ ex, value, onChange, disabled }: InputProps<MultipleChoiceExercise>) {
  return (
    <div className="flex flex-wrap gap-2">
      {ex.options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(opt)}
            className={`${chip} ${
              selected
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-zinc-300 bg-white hover:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FillBlank({ value, onChange, disabled }: InputProps<FillBlankExercise>) {
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Escribe tu respuesta"
      autoComplete="off"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      // text-base (16px) evita que el iPhone haga zoom al escribir
      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-950"
    />
  );
}

function WordOrder({
  ex,
  onChange,
  disabled,
}: Omit<InputProps<WordOrderExercise>, "value">) {
  const [picked, setPicked] = useState<number[]>([]);
  const update = (next: number[]) => {
    setPicked(next);
    onChange(next.map((i) => ex.words[i]).join(" "));
  };
  return (
    <div className="space-y-3">
      <div className="flex min-h-12 flex-wrap gap-2 rounded-lg border border-dashed border-zinc-300 p-2 dark:border-zinc-700">
        {picked.length === 0 && (
          <span className="self-center px-1 text-sm text-zinc-400">
            Toca las palabras en orden
          </span>
        )}
        {picked.map((i, pos) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => update(picked.filter((_, p) => p !== pos))}
            className={`${chip} border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300`}
          >
            {ex.words[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {ex.words.map((w, i) =>
          picked.includes(i) ? null : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => update([...picked, i])}
              className={`${chip} border-zinc-300 bg-white hover:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950`}
            >
              {w}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function ClosedInput(props: InputProps<ClosedExercise>) {
  const { ex } = props;
  switch (ex.type) {
    case "multiple_choice":
      return <MultipleChoice {...props} ex={ex} />;
    case "fill_blank":
      return <FillBlank {...props} ex={ex} />;
    case "word_order":
      return <WordOrder ex={ex} onChange={props.onChange} disabled={props.disabled} />;
  }
}

function ScoreBanner({ grade }: { grade: LessonGrade }) {
  const good = grade.score >= 80;
  const message = good
    ? "¡Muy bien! Dominas el tema."
    : grade.score >= 50
      ? "Vas bien. Repasa los errores y vuelve a intentarlo."
      : "Repasa la explicación y los ejemplos, y vuelve a intentarlo.";
  return (
    <div
      className={`rounded-2xl p-5 ${
        good
          ? "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100"
          : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
      }`}
    >
      <p className="text-3xl font-bold">
        {grade.score}
        <span className="text-lg font-medium">/100</span>
      </p>
      <p className="mt-1">
        {grade.correct} de {grade.total} correctas. {message}
      </p>
      {grade.failedErrorTypes.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span>Errores a reforzar:</span>
          {grade.failedErrorTypes.map((t) => (
            <code key={t} className="rounded bg-white/70 px-2 py-0.5 dark:bg-black/30">
              {t}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExercisesForm({
  exercises,
  onGraded,
}: {
  exercises: Exercise[];
  // CP-4: avisa a la pantalla para guardar el resultado (attempt 0 = primer intento)
  onGraded?: (grade: LessonGrade, attempt: number) => void;
}) {
  const closed = exercises.filter(isClosedExercise);
  const open = exercises.filter((e): e is OpenExercise => !isClosedExercise(e));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<LessonGrade | null>(null);
  const [attempt, setAttempt] = useState(0); // al cambiar, reinicia los ejercicios
  const topRef = useRef<HTMLElement>(null);

  const answered = closed.filter((ex) => (answers[ex.id] ?? "").trim() !== "").length;
  const scrollTop = () =>
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  function submit() {
    const result = gradeLesson(exercises, answers);
    setGrade(result);
    onGraded?.(result, attempt);
    scrollTop();
  }

  function retry() {
    setAnswers({});
    setGrade(null);
    setAttempt((a) => a + 1);
    scrollTop();
  }

  return (
    <section ref={topRef} className="scroll-mt-6 space-y-4">
      <h2 className={sectionTitle}>Ejercicios</h2>
      {grade && <ScoreBanner grade={grade} />}

      <ol key={attempt} className="space-y-4">
        {closed.map((ex, i) => {
          const result = grade?.results.find((r) => r.exerciseId === ex.id);
          const border = !result
            ? "border-zinc-200 dark:border-zinc-800"
            : result.correct
              ? "border-green-500"
              : "border-red-500";
          return (
            <li key={ex.id} className={`rounded-2xl border-2 bg-white p-5 dark:bg-zinc-900 ${border}`}>
              <p className="mb-2 text-sm text-zinc-500">
                {i + 1}. {ex.type === "word_order" ? ex.prompt : LABELS[ex.type]}
              </p>
              {ex.type !== "word_order" && (
                <p className="mb-4 text-lg font-medium">{ex.prompt}</p>
              )}
              <ClosedInput
                ex={ex}
                value={answers[ex.id] ?? ""}
                onChange={(v) => setAnswers((a) => ({ ...a, [ex.id]: v }))}
                disabled={grade !== null}
              />
              {result && (
                <div className="mt-3 flex items-center gap-2">
                  <SpeakButton text={correctSentence(ex)} label="Escuchar la frase correcta" />
                  {result.correct ? (
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">✓ Correcto</p>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ✗ Respuesta correcta: <strong>{result.expected}</strong>
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {grade === null ? (
        <button type="button" onClick={submit} disabled={answered === 0} className={primary}>
          Calificar ({answered}/{closed.length})
        </button>
      ) : (
        <button type="button" onClick={retry} className={primary}>
          Intentar de nuevo
        </button>
      )}

      {open.length > 0 && (
        <div className="space-y-3 pt-6">
          <h2 className={sectionTitle}>Práctica libre</h2>
          {open.map((ex) => (
            <div
              key={ex.id}
              className="rounded-2xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700"
            >
              <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
                {ex.type === "writing" ? (
                  <PenLine className="size-4" aria-hidden />
                ) : (
                  <Mic className="size-4" aria-hidden />
                )}
                {ex.type === "writing"
                  ? "Escritura · corrección con IA en el CP-4"
                  : "Speaking · voz en el CP-5"}
              </div>
              <p>{ex.prompt}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}