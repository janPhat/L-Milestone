import { describe, expect, test } from "vitest";
import { isoDateInTimeZone } from "./tracker";

describe("isoDateInTimeZone", () => {
  // 2026-01-01T20:00Z is already past midnight in Bangkok (UTC+7) but still
  // afternoon in New York (UTC-5) — the per-user day boundary must differ.
  const instant = new Date("2026-01-01T20:00:00Z");

  test("given a UTC-evening instant > then Bangkok is the next calendar day", () => {
    expect(isoDateInTimeZone(instant, "Asia/Bangkok")).toBe("2026-01-02");
  });

  test("given the same instant > then New York is still the previous day", () => {
    expect(isoDateInTimeZone(instant, "America/New_York")).toBe("2026-01-01");
  });

  test("given UTC > then the date is the UTC calendar day", () => {
    expect(isoDateInTimeZone(instant, "UTC")).toBe("2026-01-01");
  });
});
