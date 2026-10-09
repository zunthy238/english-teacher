// lib/providers.ts
// Valida una key con una llamada GRATUITA al proveedor (listar modelos). No genera costo.
import "server-only";
import type { Provider } from "@/lib/keys-input";

export type Validation =
  | { ok: true; warning: string | null }
  | { ok: false; error: string };

export async function validateProviderKey(provider: Provider, apiKey: string): Promise<Validation> {
  const request =
    provider === "openai"
      ? new Request("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
      : new Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
          headers: { "x-goog-api-key": apiKey },
        });

  let res: Response;
  try {
    res = await fetch(request, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  } catch {
    return { ok: false, error: "No se pudo contactar al proveedor. Intenta de nuevo." };
  }

  if (res.ok) {
    return {
      ok: true,
      warning:
        provider === "openai"
          ? "Key válida. OpenAI no confirma tu saldo en esta prueba: revisa Billing."
          : null,
    };
  }
  if (res.status === 429) {
    return { ok: true, warning: "Key válida, pero el proveedor reporta límite o saldo agotado." };
  }
  if ([400, 401, 403].includes(res.status)) {
    return { ok: false, error: "El proveedor rechazó la key. Revisa que la copiaste completa." };
  }
  return { ok: false, error: `El proveedor respondió con error ${res.status}. Intenta más tarde.` };
}
