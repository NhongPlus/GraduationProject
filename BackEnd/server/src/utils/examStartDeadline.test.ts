import { describe, it, expect } from "vitest";
import {
  closesAtToTimestampMs,
  isMalformedClosesAt,
  isPastClosesAt,
  normalizeClosesAtInput,
} from "./examStartDeadline";

describe("examStartDeadline", () => {
  const t0 = Date.UTC(2026, 3, 18, 12, 0, 0);

  describe("closesAtToTimestampMs", () => {
    it("parses ISO string", () => {
      const iso = new Date(t0).toISOString();
      expect(closesAtToTimestampMs(iso)).toBe(t0);
    });

    it("returns null for invalid input", () => {
      expect(closesAtToTimestampMs("invalid-xyz")).toBeNull();
    });
  });

  describe("isMalformedClosesAt", () => {
    it("false for empty / omitted", () => {
      expect(isMalformedClosesAt(undefined)).toBe(false);
      expect(isMalformedClosesAt(null)).toBe(false);
      expect(isMalformedClosesAt("")).toBe(false);
    });

    it("true for non-empty garbage", () => {
      expect(isMalformedClosesAt("not-a-date")).toBe(true);
    });

    it("false for valid ISO", () => {
      expect(isMalformedClosesAt(new Date(t0).toISOString())).toBe(false);
    });
  });

  describe("isPastClosesAt", () => {
    it("false before deadline", () => {
      const future = new Date(t0 + 3600_000).toISOString();
      expect(isPastClosesAt(future, t0)).toBe(false);
    });

    it("true after deadline", () => {
      const past = new Date(t0 - 1).toISOString();
      expect(isPastClosesAt(past, t0)).toBe(true);
    });
  });

  describe("normalizeClosesAtInput", () => {
    it("null for empty", () => {
      expect(normalizeClosesAtInput(undefined)).toBeNull();
      expect(normalizeClosesAtInput(null)).toBeNull();
      expect(normalizeClosesAtInput("")).toBeNull();
    });

    it("returns string when provided", () => {
      expect(normalizeClosesAtInput("2026-04-20T00:00:00.000Z")).toBe("2026-04-20T00:00:00.000Z");
    });
  });
});
