// app/api/lesson/route.ts
// GET /api/lesson        → lección del día (caché primero; IA solo si hace falta)
// GET /api/lesson?new=1  → otra versión del mismo tema
import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getDailyLesson, LessonError } from "@/lib/lessons";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return json({ error: "Inicia sesión para continuar.", code: "auth" }, 401);

  const newVariant = new URL(request.url).searchParams.get("new") === "1";
  try {
    return json(await getDailyLesson(userId, { newVariant }));
  } catch (e) {
    if (e instanceof LessonError) return json({ error: e.message, code: e.code }, e.status);
    console.error("[api/lesson] error inesperado:", e instanceof Error ? e.message : e);
    return json({ error: "No se pudo preparar tu lección. Intenta de nuevo.", code: "unknown" }, 500);
  }
}
