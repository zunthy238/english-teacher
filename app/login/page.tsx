// app/login/page.tsx
// Pantalla de acceso. El registro público está desactivado: los usuarios se crean en Supabase.
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3 text-center">
          <Image
            src="/icon-192.png"
            alt=""
            width={64}
            height={64}
            className="mx-auto rounded-2xl"
            priority
          />
          <div>
            <h1 className="text-2xl font-semibold">Professor Mike</h1>
            <p className="text-sm text-zinc-500">Tu profesor de inglés, A1 → C1</p>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <LoginForm />
        </div>
        <p className="text-center text-xs text-zinc-500">Acceso solo por invitación.</p>
      </div>
    </main>
  );
}
