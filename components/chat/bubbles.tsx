"use client";
// components/chat/bubbles.tsx — burbujas estilo WhatsApp de Mike Chat
import { useState } from "react";
import { Mic, Pause, Play, Volume2 } from "lucide-react";
import type { ChatEntry } from "@/lib/chat/state";
import type { Story } from "@/lib/schemas/story";
import { speak, speakLines, stopSpeech } from "@/components/lesson/speech";

// *texto* → negrita
export function Rich({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <b key={i} className="font-extrabold">
            {p}
          </b>
        ) : (
          <span key={i} className="whitespace-pre-line">
            {p}
          </span>
        ),
      )}
    </>
  );
}

function AudioLine({ en, es, big = false }: { en: string; es?: string | null; big?: boolean }) {
  const [showEs, setShowEs] = useState(false);
  return (
    <div className="mt-1.5 flex items-start gap-2.5">
      <button
        type="button"
        onClick={() => speak(en, big)}
        aria-label="Escuchar"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white active:scale-95"
      >
        <Play className="ml-0.5 size-4 fill-current" aria-hidden />
      </button>
      <div className="min-w-0">
        <p className={`${big ? "text-[19px]" : "text-[16px]"} font-bold leading-snug`}>{en}</p>
        {es &&
          (showEs ? (
            <p className="text-[13px] italic text-muted">{es}</p>
          ) : (
            <button type="button" onClick={() => setShowEs(true)} className="text-[12px] font-bold text-listen">
              Ver traducción
            </button>
          ))}
      </div>
    </div>
  );
}

const mikeBase = "max-w-[86%] self-start rounded-[18px] rounded-tl-[4px] bg-white px-3.5 py-2.5 text-[15px] leading-snug text-ink shadow-[0_1px_1px_rgba(21,23,58,0.08)]";

export function Bubble({ entry, story }: { entry: ChatEntry; story: Story | null }) {
  switch (entry.t) {
    case "mike":
      if (entry.rule)
        return (
          <div className="max-w-[90%] self-start rounded-[18px] bg-learn px-4 py-3 text-[15px] leading-relaxed text-[#2b1d00] pm-rise">
            <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-widest">📌 Regla</p>
            <Rich text={entry.text} />
          </div>
        );
      return (
        <div className={`${mikeBase} pm-rise`}>
          {entry.text && <Rich text={entry.text} />}
          {entry.en && <AudioLine en={entry.en} es={entry.es} big={!entry.text} />}
        </div>
      );
    case "user":
      return (
        <div className="max-w-[86%] self-end rounded-[18px] rounded-tr-[4px] bg-[#dcf8c6] px-3.5 py-2.5 text-[15px] leading-snug text-[#0b3d1f] shadow-[0_1px_1px_rgba(21,23,58,0.08)] pm-rise">
          {entry.voice && (
            <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-[#0f8c7e] px-2 py-0.5 align-middle text-[11px] font-bold text-white">
              <Mic className="size-3" aria-hidden /> voz
            </span>
          )}
          {entry.text}
        </div>
      );
    case "fb":
      return (
        <div className={`${mikeBase} border-l-4 ${entry.ok ? "border-[#16a34a]" : "border-[#f59e0b]"} pm-rise`}>
          <Rich text={entry.text} />
          {entry.words && (
            <p className="mt-1.5 text-[17px] font-bold">
              {entry.words.map((w, i) => (
                <span key={i} className={w.ok ? "text-[#15803d]" : "text-[#dc2626] underline decoration-wavy underline-offset-4"}>
                  {w.word}{" "}
                </span>
              ))}
            </p>
          )}
          {entry.en && !entry.words && <AudioLine en={entry.en} />}
          {entry.en && entry.words && (
            <button type="button" onClick={() => speak(entry.en!, true)} className="mt-1 flex items-center gap-1 text-[13px] font-bold text-listen">
              <Volume2 className="size-4" aria-hidden /> Escuchar en lento
            </button>
          )}
        </div>
      );
    case "vocab":
      return (
        <div className={`${mikeBase} pm-rise`}>
          <div className="flex flex-wrap gap-2">
            {entry.items.map((v) => (
              <button
                key={v.word}
                type="button"
                onClick={() => speak(`${v.word}. ${v.example}`, true)}
                className="rounded-xl bg-[#ece9ff] px-3 py-2 text-left active:scale-95"
              >
                <span className="block font-extrabold text-review">🔊 {v.word}</span>
                <span className="block text-[12px] text-muted">{v.meaning_es}</span>
              </button>
            ))}
          </div>
        </div>
      );
    case "story":
      return story ? <StoryBubble story={story} /> : null;
    case "eval":
      return (
        <div className={`${mikeBase} pm-rise`}>
          <p className="font-extrabold">{entry.score >= 80 ? "🎉" : "💪"} {entry.score}/100</p>
          {entry.corrections.map((c, i) => (
            <p key={i} className="mt-1.5 text-[14px]">
              <s className="text-[#dc2626]">{c.wrong}</s> → <b className="text-[#15803d]">{c.right}</b>
              {c.explanation && <span className="block text-[12.5px] text-muted">{c.explanation}</span>}
            </p>
          ))}
          <p className="mt-2 text-[12px] font-extrabold uppercase tracking-widest text-muted">Versión mejorada</p>
          <AudioLine en={entry.improved} />
        </div>
      );
  }
}

function StoryBubble({ story }: { story: Story }) {
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  function toggle() {
    if (playing) {
      stopSpeech();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    speakLines(
      story.lines.map((l) => ({ text: l.en, speaker: l.speaker, gender: story.speakers[l.speaker].gender })),
      { onEnd: () => setPlaying(false) },
    );
  }
  return (
    <div className={`${mikeBase} w-[86%] pm-rise`}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={toggle} aria-label={playing ? "Detener" : "Escuchar la historia"} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-listen text-white active:scale-95">
          {playing ? <Pause className="size-5" aria-hidden /> : <Play className="ml-0.5 size-5 fill-current" aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">
            {story.scene_emoji} {story.title}
          </p>
          <div className="mt-1 flex h-4 items-center gap-[3px]" aria-hidden>
            {[6, 12, 8, 14, 10, 16, 7, 13, 9, 15, 6, 11, 8, 12].map((h, i) => (
              <i key={i} className={`w-1 rounded-full bg-listen/60 ${playing ? "animate-pulse" : ""}`} style={{ height: h }} />
            ))}
          </div>
        </div>
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 text-[12px] font-bold text-listen">
        {open ? "Ocultar texto" : "Ver texto (después de escuchar)"}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1 text-[13.5px]">
          {story.lines.map((l, i) => (
            <p key={i}>
              <b>{story.speakers[l.speaker].name}:</b> {l.en}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function Typing() {
  return (
    <div className={`${mikeBase} flex items-center gap-1 py-3.5`} aria-label="Mike está escribiendo">
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-2 animate-bounce rounded-full bg-muted/60" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  );
}
