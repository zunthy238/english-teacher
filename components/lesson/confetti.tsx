// components/lesson/confetti.tsx
// Celebración breve al cumplir la meta. Respeta "reducir movimiento" del sistema.
const COLORS = ["#8b7cff", "#ffc93c", "#4ade80", "#38bdf8", "#f87171", "#ffffff"];

export function Confetti() {
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: ((i * 13) % 10) / 10,
    duration: 1.8 + ((i * 7) % 10) / 10,
    color: COLORS[i % COLORS.length],
    size: 6 + (i % 4) * 2,
    round: i % 3 === 0,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="pm-confetti absolute -top-4 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            background: p.color,
            borderRadius: p.round ? "50%" : 2,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
