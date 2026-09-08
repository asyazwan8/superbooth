import { describe, expect, it } from "vitest";
import { normalisePrivateKey } from "@/lib/env";

/**
 * A service-account key reaches production through a copy-paste, and the three
 * shapes below are what actually arrive. All describe the same key, so all must
 * be accepted — every rejection here costs an operator a deploy cycle against
 * an error message that only says "Failed to parse private key".
 */
const BODY = "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7";
const CANONICAL = `-----BEGIN PRIVATE KEY-----\n${BODY}\n-----END PRIVATE KEY-----\n`;

describe("normalisePrivateKey", () => {
  it("accepts a key that already has real newlines", () => {
    expect(normalisePrivateKey(CANONICAL)).toBe(CANONICAL);
  });

  it("accepts literal backslash-n, as Vercel's editor stores it", () => {
    const escaped = `-----BEGIN PRIVATE KEY-----\\n${BODY}\\n-----END PRIVATE KEY-----\\n`;
    expect(normalisePrivateKey(escaped)).toBe(CANONICAL);
  });

  it("strips the double quotes that come with a copy from the JSON file", () => {
    const quoted = `"-----BEGIN PRIVATE KEY-----\\n${BODY}\\n-----END PRIVATE KEY-----\\n"`;
    expect(normalisePrivateKey(quoted)).toBe(CANONICAL);
  });

  it("handles single quotes and stray surrounding whitespace too", () => {
    const messy = `  '-----BEGIN PRIVATE KEY-----\\n${BODY}\\n-----END PRIVATE KEY-----\\n'  `;
    expect(normalisePrivateKey(messy)).toBe(CANONICAL);
  });

  it("does not strip a quote that is only on one side", () => {
    // A half-quoted value is a genuine paste error, not a shape to accept.
    expect(() => normalisePrivateKey(`"not a key`)).toThrow(/does not look like a PEM/);
  });

  it("rejects a value that is clearly not a key, naming the variable", () => {
    expect(() => normalisePrivateKey("hunter2")).toThrow(/FIREBASE_PRIVATE_KEY/);
  });

  it("rejects an empty value rather than passing it to the Admin SDK", () => {
    expect(() => normalisePrivateKey("   ")).toThrow(/does not look like a PEM/);
  });
});
