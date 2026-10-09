// app/(app)/layout.tsx
// Diseño común de las pantallas de estudio: menú + contenido centrado.
import { Suspense } from "react";
import { AppNav, ActiveAppNav } from "@/components/app-nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Mientras se detecta la página activa, se muestra el menú sin resaltar */}
      <Suspense fallback={<AppNav />}>
        <ActiveAppNav />
      </Suspense>
      <div className="md:pl-60">
        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}