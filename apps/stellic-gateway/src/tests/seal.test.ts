import { describe, test, expect } from "bun:test";
import { randomBytes } from "node:crypto";
import { seal, unseal, loadSealKey } from "../crypto/seal.ts";

describe("seal/unseal", () => {
  const key = randomBytes(32);

  test("round-trips an object", () => {
    const value = { jar: { cookies: [{ key: "sessionid", value: "abc" }] } };
    expect(unseal(key, seal(key, value))).toEqual(value);
  });

  test("ciphertext differs each time (random IV)", () => {
    const value = { a: 1 };
    expect(seal(key, value)).not.toBe(seal(key, value));
  });

  test("rejects a tampered blob", () => {
    const blob = seal(key, { a: 1 });
    const raw = Buffer.from(blob, "base64");
    raw[raw.length - 1] ^= 0xff;
    expect(() => unseal(key, raw.toString("base64"))).toThrow();
  });

  test("rejects the wrong key", () => {
    const blob = seal(key, { a: 1 });
    expect(() => unseal(randomBytes(32), blob)).toThrow();
  });
});

describe("loadSealKey", () => {
  test("accepts 64 hex chars", () => {
    expect(loadSealKey("a".repeat(64)).length).toBe(32);
  });

  test("rejects a short key", () => {
    expect(() => loadSealKey("abcd")).toThrow();
  });

  test("rejects a missing key", () => {
    expect(() => loadSealKey(undefined)).toThrow();
  });
});
