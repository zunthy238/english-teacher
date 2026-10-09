// lib/quota.ts
// Cuota diaria por usuario (tabla usage_daily). El día se cuenta en hora de Colombia.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export function dailyLimit(): number {
  const n = Number(process.env.DAILY_REQUEST_LIMIT ?? 50);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 50;
}

function todayBogota(): string {
  // en-CA da formato AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

// Suma 1 de forma atómica. allowed=false si ya se alcanzó el límite del día.
export async function consumeRequest(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = dailyLimit();
  const { data, error } = await createAdminClient().rpc("consume_request", {
    p_user: userId,
    p_limit: limit,
  });
  if (error) throw new Error("No se pudo verificar la cuota.");
  return data === null ? { allowed: false, used: limit, limit } : { allowed: true, used: data as number, limit };
}

export async function getUsage(userId: string): Promise<{ used: number; limit: number }> {
  const { data } = await createAdminClient()
    .from("usage_daily")
    .select("requests")
    .eq("user_id", userId)
    .eq("day", todayBogota())
    .maybeSingle();
  return { used: data?.requests ?? 0, limit: dailyLimit() };
}
