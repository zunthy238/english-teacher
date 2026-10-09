// lib/keys-input.test.ts
import { describe, it, expect } from "vitest";
import { parseKeyInput, keyHint } from "./keys-input";

const valid = "sk-proj-abcdefghijklmnopqrstuvwxyz1234";

describe("parseKeyInput", () => {
  it("acepta openai y gemini con una key bien formada", () => {
    expect(parseKeyInput({ provider: "openai", apiKey: valid })).toEqual({
      ok: true,
      provider: "openai",
      apiKey: valid,
    });
    expect(parseKeyInput({ provider: "gemini", apiKey: valid }).ok).toBe(true);
  });
  it("quita espacios al inicio y al final", () => {
    const r = parseKeyInput({ provider: "openai", apiKey: `  ${valid}\n` });
    expect(r.ok && r.apiKey).toBe(valid);
  });
  it("rechaza proveedores desconocidos", () => {
    expect(parseKeyInput({ provider: "anthropic", apiKey: valid }).ok).toBe(false);
  });
  it("rechaza keys vacías, cortas o con espacios internos", () => {
    expect(parseKeyInput({ provider: "openai", apiKey: "" }).ok).toBe(false);
    expect(parseKeyInput({ provider: "openai", apiKey: "sk-123" }).ok).toBe(false);
    expect(parseKeyInput({ provider: "openai", apiKey: "sk-proj abc defghijklmnopqrstuvwxyz" }).ok).toBe(false);
  });
  it("rechaza cuerpos inválidos", () => {
    expect(parseKeyInput(null).ok).toBe(false);
    expect(parseKeyInput("texto").ok).toBe(false);
  });
});

describe("keyHint", () => {
  it("devuelve solo los últimos 4 caracteres", () => {
    expect(keyHint(valid)).toBe("1234");
  });
});
