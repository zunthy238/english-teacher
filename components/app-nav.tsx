// components/app-nav.tsx
// Menú principal: barra inferior en celular, barra lateral desde tableta (md).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Mic, TrendingUp, Settings } from "lucide-react";

const ITEMS = [
  { href: "/today", label: "Hoy", Icon: BookOpen },
  { href: "/practice", label: "Práctica", Icon: Mic },
  { href: "/progress", label: "Progreso", Icon: TrendingUp },
  { href: "/settings", label: "Ajustes", Icon: Settings },
] as const;

export function AppNav({ active }: { active?: string }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:inset-y-0 md:left-0 md:right-auto md:w-60 md:border-r md:border-t-0 md:pb-0"
    >
      <div className="hidden px-6 py-6 md:block">
        <p className="text-lg font-semibold">Professor Mike</p>
        <p className="text-xs text-zinc-500">English A1 → C1</p>
      </div>
      <ul className="flex h-16 items-stretch justify-around md:h-auto md:flex-col md:gap-1 md:px-3">
        {ITEMS.map(({ href, label, Icon }) => {
          const isActive = active?.startsWith(href) ?? false;
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors md:h-11 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-sm ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 md:bg-blue-50 md:dark:bg-blue-950"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 md:hover:bg-zinc-100 md:dark:hover:bg-zinc-900"
                }`}
              >
                <Icon className="size-5" aria-hidden />
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