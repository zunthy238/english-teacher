// app/(app)/today/page.tsx
// CP-3: la lección viene de /api/lesson (caché compartido o IA con la key del usuario).
import { DailyLesson } from "@/components/lesson/daily-lesson";

export default function TodayPage() {
  return <DailyLesson />;
}
