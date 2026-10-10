// app/api/story/route.ts
// GET /api/story?topic=A1_xxx → historia para escuchar del tema (caché primero; IA solo la primera vez).
import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { LessonError } from "@/lib/lessons";
import { getStory } from "@/lib/stories";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return json({ error: "Inicia sesión para continuar.", code: "auth" }, 401);

  const topic = new URL(request.url).searchParams.get("topic") ?? "";
  try {
    return json(await getStory(userId, topic));
  } catch (e) {
    if (e instanceof LessonError) return json({ error: e.message, code: e.code }, e.status);
    console.error("[api/story] error inesperado:", e instanceof Error ? e.message : e);
    return json({ error: "No se pudo preparar la historia.", code: "unknown" }, 500);
  }
}
