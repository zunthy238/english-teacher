// lib/crypto.ts
// Cifrado AES-256-GCM de las API keys. Funciones puras (la clave maestra entra como parámetro)
// para poder probarlas; getMasterKey() la lee del entorno del servidor.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type Encrypted = { ciphertext: string; iv: string; tag: string }; // base64

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // tamaño recomendado para GCM

export function getMasterKey(): Buffer {
  const raw = process.env.KEYS_MASTER_SECRET;
  if (!raw) throw new Error("Falta KEYS_MASTER_SECRET en el entorno del servidor.");
  return parseMasterKey(raw);
}

export function parseMasterKey(base64: string): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== 32) {
    throw new Error("KEYS_MASTER_SECRET debe ser de 32 bytes en base64.");
  }
  return key;
}

export function encrypt(plaintext: string, masterKey: Buffer): Encrypted {
  const iv = randomBytes(IV_BYTES); // nuevo en cada cifrado: nunca reutilizar
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

// Lanza error si el dato fue alterado o la clave maestra no es la correcta.
export function decrypt(data: Encrypted, masterKey: Buffer): string {
  const decipher = createDecipheriv(ALGORITHM, masterKey, Buffer.from(data.iv, "base64"));
  decipher.setAuthTag(Buffer.from(data.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
