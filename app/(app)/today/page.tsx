// app/(app)/today/page.tsx
export default function TodayPage() {
  return (
    <section className="space-y-2">
      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Hoy</p>
      <h1 className="text-2xl font-semibold">Lección del día</h1>
      <p className="text-zinc-500">Aquí aparecerá tu lección con ejercicios.</p>
    </section>
  );
}