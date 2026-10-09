// components/settings/api-keys-panel.tsx
// Registrar, probar y borrar API keys. La key se envía una sola vez al servidor
// y se borra del formulario de inmediato: la app nunca la vuelve a mostrar.
"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Trash2 } from "lucide-react";

type Provider = "openai" | "gemini";
type KeyStatus = { provider: Provider; key_hint: string | null; validated_at: string | null };
type Data = { keys: KeyStatus[]; usage: { used: number; limit: number } };
type Message = { kind: "ok" | "warn" | "error"; text: string } | null;

const PROVIDERS: { id: Provider; name: string; note: string; url: string; placeholder: string }[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    note: "Tiene nivel gratuito. Recomendado para empezar.",
    url: "https://aistudio.google.com/apikey",
    placeholder: "AIza...",
  },
  {
    id: "openai",
    name: "OpenAI",
    note: "Pago por uso. Usa saldo prepago sin recarga automática.",
    url: "https://platform.openai.com/api-keys",
    placeholder: "sk-...",
  },
];

const card = "rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";
const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50";

function MessageBox({ message }: { message: Message }) {
  if (!message) return null;
  const styles = {
    ok: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
    warn: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    error: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  }[message.kind];
  return (
    <p role="status" className={`rounded-lg px-3 py-2 text-sm ${styles}`}>
      {message.text}
    </p>
  );
}

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function ApiKeysPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<Provider, string>>({ openai: "", gemini: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/keys", { cache: "no-store" });
    const body = await readJson(res);
    if (!res.ok) {
      setLoadError(body.error ?? "No se pudo cargar la configuración.");
      return;
    }
    setLoadError(null);
    setData(body as Data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const say = (key: string, message: Message) => setMessages((m) => ({ ...m, [key]: message }));

  async function save(provider: Provider) {
    const apiKey = drafts[provider];
    setDrafts((d) => ({ ...d, [provider]: "" })); // se borra del formulario de inmediato
    setBusy(provider);
    say(provider, null);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
    });
    const body = await readJson(res);
    setBusy(null);
    if (!res.ok) return say(provider, { kind: "error", text: body.error ?? "No se pudo guardar." });
    say(provider, body.warning ? { kind: "warn", text: body.warning } : { kind: "ok", text: "Key verificada y guardada cifrada." });
    await load();
  }

  async function remove(provider: Provider) {
    if (busy) return;
    setBusy(provider);
    const res = await fetch(`/api/keys?provider=${provider}`, { method: "DELETE" });
    const body = await readJson(res);
    setBusy(null);
    say(provider, res.ok ? { kind: "ok", text: "Key borrada." } : { kind: "error", text: body.error ?? "No se pudo borrar." });
    await load();
  }

  async function test() {
    setBusy("test");
    say("test", null);
    const res = await fetch("/api/keys/test", { method: "POST" });
    const body = await readJson(res);
    setBusy(null);
    if (res.ok) {
      say("test", { kind: body.warning ? "warn" : "ok", text: body.warning ?? `Conexión correcta con ${body.provider === "openai" ? "OpenAI" : "Gemini"}.` });
    } else {
      say("test", { kind: res.status === 429 ? "warn" : "error", text: body.error ?? "La prueba falló." });
    }
    await load();
  }

  if (loadError) return <MessageBox message={{ kind: "error", text: loadError }} />;
  if (!data) {
    return (
      <div className={`${card} flex items-center gap-2 text-sm text-zinc-500`}>
        <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando…
      </div>
    );
  }

  const pct = Math.min(100, (data.usage.used / data.usage.limit) * 100);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tu API key</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          La IA del profesor funciona con tu propia key. Se guarda cifrada en el servidor y nunca se vuelve a mostrar;
          solo verás sus últimos 4 caracteres.
        </p>

        {PROVIDERS.map((p) => {
          const saved = data.keys.find((k) => k.provider === p.id);
          return (
            <div key={p.id} className={`${card} space-y-3`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-zinc-500">{p.note}</p>
                </div>
                {saved && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-950 dark:text-green-200">
                    <CheckCircle2 className="size-3.5" aria-hidden /> Activa
                  </span>
                )}
              </div>

              {saved ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-sm">
                    ••••••••{saved.key_hint}
                    {saved.validated_at && (
                      <span className="ml-2 font-sans text-xs text-zinc-500">
                        verificada {new Date(saved.validated_at).toLocaleDateString("es-CO")}
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    disabled={busy !== null}
                    className={`${btn} border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950`}
                  >
                    <Trash2 className="size-4" aria-hidden /> Borrar
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(p.id);
                  }}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    type="password"
                    value={drafts[p.id]}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                    placeholder={p.placeholder}
                    aria-label={`API key de ${p.name}`}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <button
                    type="submit"
                    disabled={busy !== null || drafts[p.id].trim() === ""}
                    className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}
                  >
                    {busy === p.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
                    Verificar y guardar
                  </button>
                </form>
              )}

              <MessageBox message={messages[p.id] ?? null} />

              {!saved && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  ¿Cómo obtengo mi key? <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Uso de hoy</h2>
        <div className={`${card} space-y-3`}>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold">
              {data.usage.used}
              <span className="text-base font-medium text-zinc-500"> / {data.usage.limit} solicitudes</span>
            </p>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-2 rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-600"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">Se reinicia a medianoche (hora de Colombia).</p>
          <button
            type="button"
            onClick={test}
            disabled={busy !== null || data.keys.length === 0}
            className={`${btn} border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800`}
          >
            {busy === "test" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Probar mi key (usa 1 solicitud)
          </button>
          <MessageBox message={messages.test ?? null} />
        </div>
      </section>
    </div>
  );
}
