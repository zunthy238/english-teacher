// app/(app)/settings/page.tsx
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Ajustes</p>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-zinc-500">Registro de tu API key (CP-2).</p>
      </section>

      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto"
        >
          <LogOut className="size-4" aria-hidden />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
