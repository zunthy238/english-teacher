// lib/crypto.test.ts
import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt, parseMasterKey } from "./crypto";

const key = randomBytes(32);
const secret = "sk-proj-EJEMPLO-no-es-una-key-real-1234";

describe("crypto AES-256-GCM", () => {
  it("cifra y descifra (ida y vuelta)", () => {
    expect(decrypt(encrypt(secret, key), key)).toBe(secret);
  });

  it("el texto cifrado no contiene la key", () => {
    const e = encrypt(secret, key);
    expect(Buffer.from(e.ciphertext, "base64").toString("utf8")).not.toContain("sk-proj");
  });

  it("usa un IV distinto en cada cifrado", () => {
    expect(encrypt(secret, key).iv).not.toBe(encrypt(secret, key).iv);
  });

  it("falla si el cifrado fue alterado", () => {
    const e = encrypt(secret, key);
    const bytes = Buffer.from(e.ciphertext, "base64");
    bytes[0] ^= 0xff;
    expect(() => decrypt({ ...e, ciphertext: bytes.toString("base64") }, key)).toThrow();
  });

  it("falla con otra clave maestra", () => {
    expect(() => decrypt(encrypt(secret, key), randomBytes(32))).toThrow();
  });

  it("rechaza una clave maestra que no mide 32 bytes", () => {
    expect(() => parseMasterKey(randomBytes(16).toString("base64"))).toThrow();
    expect(parseMasterKey(key.toString("base64")).length).toBe(32);
  });
});
