import { describe, expect, it } from "vitest";
import { fillJob, parseProfilePatch, scenariosFor, SCENARIOS, TURNS } from "./scenarios";
import { FALLBACK_LINES, pickShadowLines, scoreShadow, tipFor } from "./shadow";
import { parseRoleplayInput, validateFeedback, validateReply, type ChatMessage } from "./roleplay";
import type { Story } from "../schemas/story";

describe("escenarios según propósito", () => {
  it("quien no eligió nada ve solo vida diaria (nada de trabajo ni Power Apps)", () => {
    const list = scenariosFor([]);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((s) => s.purpose === "daily")).toBe(true);
    expect(JSON.stringify(list)).not.toMatch(/power apps/i);
  });
  it("combina varios propósitos", () => {
    const p = new Set(scenariosFor(["work", "travel"]).map((s) => s.purpose));
    expect([...p].sort()).toEqual(["travel", "work"]);
  });
  it("la profesión es de cada usuario; sin profesión queda genérico", () => {
    const interview = SCENARIOS.find((s) => s.id === "job_interview")!;
    expect(fillJob(interview.title, "Accountant")).toBe("Job interview – Accountant");
    expect(fillJob(interview.role, null)).toContain("professional");
  });
  it("cada escenario tiene apertura y ejemplo de primera respuesta", () => {
    for (const s of SCENARIOS) {
      expect(s.opening.length).toBeGreaterThan(10);
      expect(s.first_hint.length).toBeGreaterThan(5);
    }
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });
});

describe("Ajustes: parseProfilePatch", () => {
  it("acepta meta, propósitos y profesión", () => {
    const r = parseProfilePatch({ daily_minutes: 20, goals: ["work", "daily"], job_title: "  Power Apps   Developer " });
    expect(r).toEqual({ ok: true, value: { daily_minutes: 20, goals: ["work", "daily"], job_title: "Power Apps Developer" } });
  });
  it("rechaza propósitos inventados, listas vacías y profesiones raras", () => {
    expect(parseProfilePatch({ goals: ["hacker"] }).ok).toBe(false);
    expect(parseProfilePatch({ goals: [] }).ok).toBe(false);
    expect(parseProfilePatch({ job_title: "x" }).ok).toBe(false);
    expect(parseProfilePatch({ daily_minutes: 7 }).ok).toBe(false);
    expect(parseProfilePatch({}).ok).toBe(false);
  });
  it("profesión vacía = sin profesión; limpia caracteres peligrosos", () => {
    expect(parseProfilePatch({ job_title: "" })).toEqual({ ok: true, value: { job_title: null } });
    expect(parseProfilePatch({ job_title: "Dev <script>" })).toEqual({ ok: true, value: { job_title: "Dev script" } });
  });
});

describe("repite como nativo", () => {
  it("califica lo que entendió el micrófono", () => {
    const r = scoreShadow("Sorry, my train was delayed.", "sorry my train was delay");
    expect(r.pct).toBe(80);
    expect(r.pass).toBe(true);
    expect(r.tip).toContain("-ed");
  });
  it("acepta contracciones y no castiga mayúsculas ni puntuación", () => {
    expect(scoreShadow("I'm looking forward to it.", "I am looking forward to it").pct).toBe(100);
  });
  it("consejos útiles", () => {
    expect(tipFor("think")).toContain("th");
    expect(tipFor("works")).toContain("s");
    expect(tipFor("don't")).toContain("contracción");
  });
  it("elige frases cortas de la historia y tiene respaldo por nivel", () => {
    const story = {
      lines: [
        { speaker: 0, en: "Hi!", es: "¡Hola!" },
        { speaker: 1, en: "Sorry, my train was delayed.", es: "x" },
        { speaker: 0, en: "No worries, here's your badge.", es: "y" },
      ],
    } as unknown as Story;
    expect(pickShadowLines(story).map((l) => l.en)).toEqual(["Sorry, my train was delayed.", "No worries, here's your badge."]);
    for (const lv of ["A1", "A2", "B1", "B2", "C1"] as const) expect(FALLBACK_LINES[lv]).toHaveLength(5);
  });
});

describe("roleplay", () => {
  const convo = (n: number): ChatMessage[] => {
    const m: ChatMessage[] = [{ role: "mike", text: "Hi! How are you?" }];
    for (let i = 0; i < n; i++) {
      m.push({ role: "user", text: `answer ${i}` });
      if (i < n - 1) m.push({ role: "mike", text: `question ${i}` });
    }
    return m;
  };
  it("acepta una conversación válida que termina con el estudiante", () => {
    expect(parseRoleplayInput({ scenario_id: "coffee_shop", messages: convo(2) }).ok).toBe(true);
  });
  it("rechaza escenarios inventados, turnos desordenados y conversaciones demasiado largas", () => {
    expect(parseRoleplayInput({ scenario_id: "x", messages: convo(1) }).ok).toBe(false);
    expect(parseRoleplayInput({ scenario_id: "coffee_shop", messages: [{ role: "user", text: "hi" }, { role: "mike", text: "hi" }] }).ok).toBe(false);
    expect(parseRoleplayInput({ scenario_id: "coffee_shop", messages: convo(TURNS + 1) }).ok).toBe(false);
  });
  it("la retroalimentación exige al menos 2 turnos", () => {
    expect(parseRoleplayInput({ scenario_id: "coffee_shop", messages: convo(1) }, { requireComplete: true }).ok).toBe(false);
    expect(parseRoleplayInput({ scenario_id: "coffee_shop", messages: convo(3), minutes: 4.4 }, { requireComplete: true })).toMatchObject({
      ok: true,
      value: { minutes: 4 },
    });
  });
  it("valida la respuesta de Mike; en el cierre no hay pista", () => {
    expect(validateReply({ reply: "Great! What size?", hint: "A medium, please." }, false)).toEqual({
      ok: true,
      value: { reply: "Great! What size?", hint: "A medium, please." },
    });
    expect(validateReply({ reply: "Bye!", hint: "x" }, true)).toEqual({ ok: true, value: { reply: "Bye!", hint: null } });
    expect(validateReply({ reply: "", hint: null }, false).ok).toBe(false);
  });
  it("la retroalimentación descarta 'errores' que solo son contracciones y limita a 3", () => {
    const r = validateFeedback(
      {
        understood: 9,
        corrections: [
          { wrong: "I build an app", right: "I built an app", why_es: "pasado", error_type: "Past Simple" },
          { wrong: "I am happy", right: "I'm happy", why_es: "x", error_type: "contraction" },
          { wrong: "a", right: "b", why_es: "", error_type: "x" },
          { wrong: "c", right: "d", why_es: "", error_type: "y" },
          { wrong: "e", right: "f", why_es: "", error_type: "z" },
        ],
        golden_phrase: { en: "It cut processing time by 50%.", es: "Redujo el tiempo a la mitad." },
        praise_es: "Hablaste con seguridad.",
      },
      6,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.understood).toBe(6);
    expect(r.value.corrections).toHaveLength(3);
    expect(r.value.corrections[0].error_type).toBe("past_simple");
    expect(r.value.corrections.some((c) => c.right === "I'm happy")).toBe(false);
  });
});
