import { describe, expect, test } from "vitest";
import {
  generateInviteCode,
  isInviteRedeemable,
  normalizeInviteCode,
} from "./invite";

describe("normalizeInviteCode", () => {
  test("given surrounding whitespace and lowercase > then trims and uppercases", () => {
    expect(normalizeInviteCode("  lh-abc123  ")).toBe("LH-ABC123");
  });

  test("given an already-normalized code > then returns it unchanged", () => {
    expect(normalizeInviteCode("LH-ABC123")).toBe("LH-ABC123");
  });
});

describe("isInviteRedeemable", () => {
  test("given a fresh code (never used, not revoked) > then redeemable", () => {
    expect(isInviteRedeemable({ usedAt: null, revokedAt: null })).toBe(true);
  });

  test("given an already-used code > then not redeemable", () => {
    expect(isInviteRedeemable({ usedAt: new Date(), revokedAt: null })).toBe(false);
  });

  test("given a revoked code > then not redeemable", () => {
    expect(isInviteRedeemable({ usedAt: null, revokedAt: new Date() })).toBe(false);
  });

  test("given a missing row (no such code) > then not redeemable", () => {
    expect(isInviteRedeemable(null)).toBe(false);
    expect(isInviteRedeemable(undefined)).toBe(false);
  });
});

describe("generateInviteCode", () => {
  test("given a generated code > then matches the LH-<8 unambiguous chars> format", () => {
    expect(generateInviteCode()).toMatch(/^LH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
  });

  test("given many generated codes > then they are unique", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateInviteCode()));
    expect(codes.size).toBe(200);
  });
});
