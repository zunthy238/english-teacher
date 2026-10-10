// lib/review.test.ts
import { describe, it, expect } from "vitest";
import { newCard, schedule, intervalLabel, previewLabels, errorResolved, FIRST_REVIEW_DELAY_HOURS } from "./review";

const now = new Date("2026-10-10T15:00:00Z");

describe("repaso espaciado", () => {
  it("una tarjeta nueva se repasa al día siguiente", () => {
    const c = newCard(now);
    const hours = (new Date(c.due_at).getTime() - now.getTime()) / 3600_000;
    expect(hours).toBe(FIRST_REVIEW_DELAY_HOURS);
  });

  it("'Otra vez' la trae pronto y 'Fácil' la aleja más que 'Bien'", () => {
    const stored = newCard(now).fsrs;
    const again = new Date(schedule(stored, "again", now).due_at).getTime();
    const good = new Date(schedule(stored, "good", now).due_at).getTime();
    const easy = new Date(schedule(stored, "easy", now).due_at).getTime();
    expect(again).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it("los intervalos crecen cuando la recuerdas varias veces", () => {
    let stored = newCard(now).fsrs;
    let t = now;
    const gaps: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = schedule(stored, "good", t);
      const next = new Date(r.due_at);
      gaps.push(next.getTime() - t.getTime());
      stored = r.fsrs;
      t = next;
    }
    expect(gaps[3]).toBeGreaterThan(gaps[1]);
  });

  it("serializa y vuelve a leer la tarjeta (jsonb)", () => {
    const r = schedule(newCard(now).fsrs, "good", now);
    const roundTrip = JSON.parse(JSON.stringify(r.fsrs));
    expect(() => schedule(roundTrip, "good", new Date(r.due_at))).not.toThrow();
    expect(r.reps).toBe(1);
  });
});

describe("etiquetas e errores", () => {
  it("formatea intervalos", () => {
    expect(intervalLabel(now, new Date(now.getTime() + 10 * 60000))).toBe("10 min");
    expect(intervalLabel(now, new Date(now.getTime() + 5 * 3600000))).toBe("5 h");
    expect(intervalLabel(now, new Date(now.getTime() + 3 * 86400000))).toBe("3 días");
  });
  it("da una etiqueta para cada botón", () => {
    const l = previewLabels(newCard(now).fsrs, now);
    expect(Object.keys(l)).toEqual(["again", "good", "easy"]);
  });
  it("un error se supera tras 3 repasos sin olvidarlo", () => {
    expect(errorResolved(3, "good")).toBe(true);
    expect(errorResolved(3, "again")).toBe(false);
    expect(errorResolved(2, "easy")).toBe(false);
  });
});
