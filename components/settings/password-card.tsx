"use client";
// components/settings/password-card.tsx
// Ajustes → cambiar contraseña (Supabase Auth, con la sesión del usuario). La contraseña nunca pasa por nuestro servidor.
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PasswordCard() {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const problem =
    pass.length > 0 && pass.length < 8
      ? "Mínimo 8 caracteres."
      : confirm.length > 0 && confirm !== pass
        ? "Las contraseñas no coinciden."
        : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (problem || pass.length < 8 || pass !== confirm) return;
    setStatus("saving");
    setMessage(null);
    const { error } = await createClient().auth.updateUser({ password: pass });
    if (error) {
      setStatus("error");
      setMessage(
        /same/i.test(error.message)
          ? "La nueva contraseña debe ser distinta a la actual."
          : /reauth|recent/i.test(error.message)
            ? "Por seguridad, cierra sesión, vuelve a entrar e inténtalo de nuevo."
            : "No se pudo cambiar. Intenta de nuevo.",
      );
      return;
    }
    setStatus("saved");
    setPass("");
    setConfirm("");
  }

  return (
    <section className="space-y-3 rounded-[24px] bg-white p-5" aria-labelledby="pass-title">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-ink/10 text-ink">
          <KeyRound className="size-5" aria-hidden strokeWidth={2.2} />
        </span>
        <div>
          <h2 id="pass-title" className="font-bold">Cambiar contraseña</h2>
          <p className="text-sm text-muted">Mínimo 8 caracteres.</p>
        </div>
      </div>
      <form onSubmit={save} className="space-y-2.5">
        <input
          type="password"
          autoComplete="new-password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Nueva contraseña"
          aria-label="Nueva contraseña"
          className="min-h-[48px] w-full rounded-xl border-2 border-line px-3 outline-none focus:border-brand"
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repite la nueva contraseña"
          aria-label="Repite la nueva contraseña"
          className="min-h-[48px] w-full rounded-xl border-2 border-line px-3 outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={!!problem || pass.length < 8 || pass !== confirm || status === "saving"}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-ink font-bold text-white disabled:opacity-40"
        >
          {status === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Guardar contraseña
        </button>
        <p className="min-h-5 text-sm" aria-live="polite">
          {problem && <span className="text-[#dc2626]">{problem}</span>}
          {!problem && status === "saved" && <span className="text-[#15803d]">Contraseña actualizada ✓</span>}
          {!problem && message && <span className="text-[#dc2626]">{message}</span>}
        </p>
      </form>
    </section>
  );
}
