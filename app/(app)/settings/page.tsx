// app/(app)/settings/page.tsx
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { ApiKeysPanel } from "@/components/settings/api-keys-panel";
import { GoalPicker } from "@/components/settings/goal-picker";
import { PlacementCard } from "@/components/settings/placement-card";
import { PurposePicker } from "@/components/settings/purpose-picker";
import { PasswordCard } from "@/components/settings/password-card";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1 pm-rise">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">Ajustes</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Tu cuenta</h1>
      </header>

      <PlacementCard />

      <PurposePicker />

      <GoalPicker />

      <ApiKeysPanel />

      <PasswordCard />

      <form action={logout} className="border-t border-line pt-6">
        <button
          type="submit"
          className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 font-bold text-ink transition-transform active:scale-[0.98]"
        >
          <LogOut className="size-4" aria-hidden />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
