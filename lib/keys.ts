// lib/keys.ts
// Bóveda BYOK. La key en claro solo existe en memoria del servidor durante la petición.
// Nunca se registra en logs ni se devuelve al navegador.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt, getMasterKey } from "@/lib/crypto";
import { keyHint, type Provider } from "@/lib/keys-input";

export type KeyStatus = {
  provider: Provider;
  key_hint: string | null;
  validated_at: string | null;
};

export async function getKeyStatus(userId: string): Promise<KeyStatus[]> {
  const { data, error } = await createAdminClient()
    .from("user_api_keys")
    .select("provider, key_hint, validated_at") // nunca ciphertext/iv/tag
    .eq("user_id", userId);
  if (error) throw new Error("No se pudo leer el estado de las keys.");
  return (data ?? []) as KeyStatus[];
}

export async function saveKey(userId: string, provider: Provider, apiKey: string): Promise<KeyStatus> {
  const sealed = encrypt(apiKey, getMasterKey());
  const row = {
    user_id: userId,
    provider,
    ...sealed,
    key_hint: keyHint(apiKey),
    validated_at: new Date().toISOString(),
  };
  const { error } = await createAdminClient()
    .from("user_api_keys")
    .upsert(row, { onConflict: "user_id,provider" });
  if (error) throw new Error("No se pudo guardar la key.");
  return { provider, key_hint: row.key_hint, validated_at: row.validated_at };
}

export async function deleteKey(userId: string, provider: Provider): Promise<void> {
  const { error } = await createAdminClient()
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw new Error("No se pudo borrar la key.");
}

// Para las rutas de IA (CP-3+): devuelve la key del usuario. Prefiere OpenAI si tiene ambas.
export async function resolveKey(
  userId: string,
): Promise<{ provider: Provider; apiKey: string } | null> {
  const { data, error } = await createAdminClient()
    .from("user_api_keys")
    .select("provider, ciphertext, iv, tag")
    .eq("user_id", userId);
  if (error) throw new Error("No se pudo leer la key.");
  if (!data?.length) return null;
  const row = data.find((r) => r.provider === "openai") ?? data[0];
  return {
    provider: row.provider as Provider,
    apiKey: decrypt({ ciphertext: row.ciphertext, iv: row.iv, tag: row.tag }, getMasterKey()),
  };
}
