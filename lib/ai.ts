// lib/ai.ts
// Única puerta de salida hacia la IA. Recibe la key del usuario (BYOK) y devuelve JSON.
// La key nunca se registra en logs ni se incluye en mensajes de error.
import "server-only";
import type { Provider } from "@/lib/keys-input";

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: "key_rejected" | "provider_limit" | "provider_error" | "bad_output",
  ) {
    super(message);
  }
}

type JsonRequest = {
  provider: Provider;
  apiKey: string;
  system: string;
  user: string;
  schemaName: string;
  schema: object;
};

function fail(status: number): never {
  if (status === 401 || status === 403 || status === 400)
    throw new AIError("El proveedor rechazó tu API key. Revísala en Ajustes.", "key_rejected");
  if (status === 429)
    throw new AIError("Tu cuenta del proveedor no tiene saldo o llegó a su límite. Revisa tu facturación.", "provider_limit");
  throw new AIError(`El proveedor de IA respondió con error ${status}. Intenta de nuevo.`, "provider_error");
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
      cache: "no-store",
    });
  } catch {
    throw new AIError("La IA tardó demasiado o no respondió. Intenta de nuevo.", "provider_error");
  }
}

function parse(text: unknown): unknown {
  if (typeof text !== "string") throw new AIError("La IA no devolvió contenido.", "bad_output");
  try {
    return JSON.parse(text);
  } catch {
    throw new AIError("La IA devolvió un formato inválido.", "bad_output");
  }
}

export async function generateJson(req: JsonRequest): Promise<unknown> {
  if (req.provider === "openai") {
    // Chat Completions + Structured Outputs (json_schema estricto)
    const res = await post(
      "https://api.openai.com/v1/chat/completions",
      { Authorization: `Bearer ${req.apiKey}` },
      {
        model: OPENAI_MODEL,
        temperature: 0.7,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: req.schemaName, schema: req.schema, strict: true },
        },
      },
    );
    if (!res.ok) fail(res.status);
    const data = await res.json();
    const choice = data?.choices?.[0];
    if (choice?.message?.refusal) throw new AIError("La IA rechazó la solicitud.", "bad_output");
    if (choice?.finish_reason !== "stop") throw new AIError("La respuesta de la IA quedó incompleta.", "bad_output");
    return parse(choice?.message?.content);
  }

  // Gemini: modo JSON + esquema en el prompt. El validador de la app revisa el resultado.
  const res = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    { "x-goog-api-key": req.apiKey },
    {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [
        {
          role: "user",
          parts: [{ text: `${req.user}\n\nResponde SOLO con JSON válido que cumpla este JSON Schema:\n${JSON.stringify(req.schema)}` }],
        },
      ],
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
    },
  );
  if (!res.ok) fail(res.status);
  const data = await res.json();
  return parse(data?.candidates?.[0]?.content?.parts?.[0]?.text);
}
