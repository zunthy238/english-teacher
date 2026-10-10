// app/(app)/layout.tsx
// Diseño común de las pantallas de estudio: menú + contenido centrado.
import { Suspense } from "react";
import { AppNav, ActiveAppNav } from "@/components/app-nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      {/* Mientras se detecta la página activa, se muestra el menú sin resaltar */}
      <Suspense fallback={<AppNav />}>
        <ActiveAppNav />
      </Suspense>
      <div className="md:pl-64">
        <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
