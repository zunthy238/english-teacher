// lib/keys-input.ts
// Validación del formulario de keys (función pura, probada). No decide si la key funciona:
// eso lo confirma el proveedor en lib/providers.ts.
export const PROVIDERS = ["openai", "gemini"] as const;
export type Provider = (typeof PROVIDERS)[number];

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

export function parseKeyInput(
  body: unknown,
): { ok: true; provider: Provider; apiKey: string } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Solicitud inválida." };
  }
  const { provider, apiKey } = body as Record<string, unknown>;
  if (!isProvider(provider)) return { ok: false, error: "Proveedor no válido." };
  if (typeof apiKey !== "string") return { ok: false, error: "Escribe tu API key." };
  const key = apiKey.trim();
  if (key.length < 20 || key.length > 300 || /\s/.test(key)) {
    return { ok: false, error: "La API key no tiene un formato válido." };
  }
  return { ok: true, provider, apiKey: key };
}

// Últimos 4 caracteres, lo único que se muestra en pantalla.
export function keyHint(apiKey: string): string {
  return apiKey.slice(-4);
}
