// app/login/page.tsx
// Pantalla de acceso. El registro público está desactivado: los usuarios se crean en Supabase.
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-5 text-ink">
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
            <h1 className="font-display text-3xl font-extrabold">Professor Mike</h1>
            <p className="text-sm text-muted">Tu profesor de inglés, A1 → C1</p>
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-[0_8px_30px_rgba(21,23,58,0.08)]">
          <LoginForm />
        </div>
        <p className="text-center text-xs text-muted">Acceso solo por invitación.</p>
      </div>
    </main>
  );
}
