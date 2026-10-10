"use client";
// components/settings/placement-card.tsx
// Ajustes → nivel actual y acceso a (re)hacer la prueba de nivel.
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Compass } from "lucide-react";

export function PlacementCard() {
  const [data, setData] = useState<{ cefr_level: string; placement_at: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setData({ cefr_level: p.cefr_level, placement_at: p.placement_at }))
      .catch(() => {});
  }, []);

  const when = data?.placement_at
    ? new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long" }).format(new Date(data.placement_at))
    : null;

  return (
    <section className="space-y-3 rounded-[24px] bg-white p-5" aria-labelledby="placement-title">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-learn text-ink">
          <Compass className="size-5" aria-hidden strokeWidth={2.2} />
        </span>
        <div>
          <h2 id="placement-title" className="font-bold">Nivel de inglés</h2>
          <p className="text-sm text-muted">
            {data ? `Estás en ${data.cefr_level}` : "Cargando…"}
            {when ? ` · última prueba: ${when}` : data ? " · aún no haces la prueba" : ""}
          </p>
        </div>
      </div>
      <Link
        href="/placement"
        className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-ink px-5 font-bold text-white transition-transform active:scale-[0.98]"
      >
        {data?.placement_at ? "Repetir la prueba de nivel" : "Hacer la prueba de nivel"}
        <ArrowRight className="size-4" aria-hidden strokeWidth={2.6} />
      </Link>
      <p className="text-xs text-muted">6 minutos, sin costo. Tu avance en los temas no se borra.</p>
    </section>
  );
}
