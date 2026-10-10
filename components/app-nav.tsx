// components/app-nav.tsx
// Menú principal: barra inferior en celular, barra lateral oscura desde tableta (md).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Mic, TrendingUp, Settings } from "lucide-react";

const ITEMS = [
  { href: "/today", match: ["/today", "/lesson"], label: "Hoy", Icon: Home },
  { href: "/review", match: ["/review"], label: "Repaso", Icon: Layers },
  { href: "/practice", match: ["/practice"], label: "Hablar", Icon: Mic },
  { href: "/progress", match: ["/progress"], label: "Progreso", Icon: TrendingUp },
  { href: "/settings", match: ["/settings"], label: "Ajustes", Icon: Settings },
] as const;

export function AppNav({ active }: { active?: string }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:inset-y-0 md:left-0 md:right-auto md:w-64 md:border-t-0 md:bg-ink md:pb-0"
    >
      <div className="hidden px-6 pb-6 pt-8 md:block">
        <p className="font-display text-2xl font-extrabold text-white">Professor Mike</p>
        <p className="text-sm text-[#b9bce6]">English A1 → C1</p>
      </div>
      <ul className="flex h-16 items-stretch justify-around md:h-auto md:flex-col md:gap-1 md:px-3">
        {ITEMS.map(({ href, match, label, Icon }) => {
          const isActive = active ? match.some((m) => active.startsWith(m)) : false;
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-bold transition-colors md:h-12 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-4 md:text-[15px] ${
                  isActive
                    ? "text-brand md:bg-brand md:text-white"
                    : "text-muted hover:text-ink md:text-[#b9bce6] md:hover:bg-ink-soft md:hover:text-white"
                }`}
              >
                <span
                  className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors md:h-auto md:w-auto ${
                    isActive ? "bg-brand/12 md:bg-transparent" : ""
                  }`}
                >
                  <Icon className="size-5" aria-hidden strokeWidth={2.2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Versión que sabe en qué página estás. Debe ir dentro de <Suspense> (Cache Components).
export function ActiveAppNav() {
  const pathname = usePathname();
  return <AppNav active={pathname} />;
}
