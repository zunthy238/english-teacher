// app/(app)/today/page.tsx
// CP-0.5: lecciones de prueba. CP-3: vendrá de /api/lesson (caché o IA).
import { TodayView } from "@/components/lesson/today-view";
import { MOCK_LESSONS } from "@/lib/mock/lessons";

export default function TodayPage() {
  return <TodayView lessons={MOCK_LESSONS} />;
}