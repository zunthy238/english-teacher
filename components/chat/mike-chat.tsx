"use client";
// components/chat/mike-chat.tsx
// Carga el tema actual (lección + historia, desde el caché), la conversación guardada y el repaso del día.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Lesson } from "@/lib/schemas/lesson";
import type { Story } from "@/lib/schemas/story";
import { newChatState, type ChatState } from "@/lib/chat/state";
import type { ReviewItem } from "@/lib/review-input";
import { ChatThread, type ChatMeta } from "./chat-thread";

type Load =
  | { status: "loading"; slow: boolean }
  | { status: "error"; message: string; code: string }
  | { status: "ready"; lesson: Lesson; story: Story | null; meta: ChatMeta; initial: ChatState };

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#e9ebf7] text-ink">
      <header className="bg-ink text-white">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <Link href="/today" aria-label="Volver a Hoy" className="flex size-10 items-center justify-center rounded-full">
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft font-display text-lg font-black text-ink">M</span>
          <p className="font-extrabold">Professor Mike</p>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 text-center">{children}</div>
    </div>
  );
}

export function MikeChat() {
  const [load, setLoad] = useState<Load>({ status: "loading", slow: false });
  const [run, setRun] = useState(0);

  const start = useCallback(async () => {
    setLoad({ status: "loading", slow: false });
    const slow = setTimeout(() => setLoad((l) => (l.status === "loading" ? { status: "loading", slow: true } : l)), 2500);
    try {
      const res = await fetch("/api/lesson", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoad({ status: "error", message: body.error ?? "No se pudo cargar el tema.", code: body.code ?? "unknown" });
        return;
      }
      const lesson = body.lesson as Lesson;
      const meta = body.meta as ChatMeta;
      const [story, saved] = await Promise.all([
        fetch(`/api/story?topic=${encodeURIComponent(meta.topic_key)}`, { cache: "no-store", signal: AbortSignal.timeout(45_000) })
          .then((r) => (r.ok ? r.json() : null))
          .then((b) => (b?.story as Story | undefined) ?? null)
          .catch(() => null),
        fetch(`/api/chat-state?topic=${encodeURIComponent(meta.topic_key)}&variant=${meta.variant}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((b) => (b?.state as ChatState | null) ?? null)
          .catch(() => null),
      ]);
      let initial = saved && saved.v === 1 ? saved : null;
      if (!initial) {
        // Conversación nueva: Mike empieza con un repaso rápido (máx. 3 tarjetas vencidas)
        const cards = await fetch("/api/review?limit=3", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((b) => ((b?.cards ?? []) as ReviewItem[]).map(({ id, kind, front, back, extra }) => ({ id, kind, front, back, extra })))
          .catch(() => []);
        initial = newChatState(cards);
      }
      setLoad({ status: "ready", lesson, story, meta, initial });
      setRun((r) => r + 1);
    } catch {
      setLoad({ status: "error", message: "Sin conexión. Revisa tu internet e intenta de nuevo.", code: "network" });
    } finally {
      clearTimeout(slow);
    }
  }, []);

  // En desarrollo React monta dos veces: el ref evita pedir el tema dos veces
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void start();
  }, [start]);

  if (load.status === "loading") {
    return (
      <Frame>
        <Loader2 className="size-9 animate-spin text-brand" aria-hidden />
        <p className="font-display text-xl font-extrabold">{load.slow ? "Mike está preparando tu clase…" : "Abriendo el chat…"}</p>
        {load.slow && <p className="text-sm text-muted">La primera vez de cada tema tarda entre 20 y 45 segundos.</p>}
      </Frame>
    );
  }
  if (load.status === "error") {
    return (
      <Frame>
        <p className="font-display text-xl font-extrabold">No se pudo abrir la clase</p>
        <p className="text-muted">{load.message}</p>
        {["no_key", "key_rejected", "provider_limit"].includes(load.code) ? (
          <Link href="/settings" className="flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-brand font-bold text-white">
            Ir a Ajustes
          </Link>
        ) : load.code !== "quota" ? (
          <button type="button" onClick={() => start()} className="min-h-[50px] w-full rounded-2xl bg-ink font-bold text-white">
            Intentar de nuevo
          </button>
        ) : null}
      </Frame>
    );
  }
  return (
    <ChatThread
      key={`${load.meta.topic_key}-${load.meta.variant}-${run}`}
      lesson={load.lesson}
      story={load.story}
      meta={load.meta}
      initial={load.initial}
      onNextTopic={() => void start()}
    />
  );
}
