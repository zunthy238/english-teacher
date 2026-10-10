// app/(app)/listen/[topic]/page.tsx
// Escuchar una historia de la biblioteca (pantalla completa).
import { Suspense } from "react";
import { StoryPlayer } from "@/components/listen/story-player";

export default function StoryPage() {
  return (
    <Suspense fallback={null}>
      <StoryPlayer />
    </Suspense>
  );
}
