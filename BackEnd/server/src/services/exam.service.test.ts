import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeAutosaveToSubmitAnswers,
  normalizeIntegrityEvents,
  submitSessionService,
} from "~/services/exam.service";
import * as examService from "~/services/exam.service";

vi.mock("~/config/db", () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from "~/config/db";
const mockedPool = pool as any;

describe("exam.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeAutosaveToSubmitAnswers", () => {
    it("passes through direct question-id keys", () => {
      const raw = {
        "uuid-q1": "A",
        "uuid-q2": "B",
      };
      const ids = ["uuid-q1", "uuid-q2"];
      const result = normalizeAutosaveToSubmitAnswers(raw, ids);
      expect(result).toEqual({ "uuid-q1": "A", "uuid-q2": "B" });
    });

    it("maps legacy q1/q2 format to ordered question ids", () => {
      const raw = { q1: "C", q2: "My essay text", q3: "Third answer", q4: "Fourth answer" };
      const ids = ["first-id", "second-id", "third-id", "fourth-id"];
      const result = normalizeAutosaveToSubmitAnswers(raw, ids);
      expect(result).toEqual({
        "first-id": "C",
        "second-id": "My essay text",
        "third-id": "Third answer",
        "fourth-id": "Fourth answer",
      });
    });

    it("returns empty object for empty question list", () => {
      const result = normalizeAutosaveToSubmitAnswers({ q1: "A" }, []);
      expect(result).toEqual({});
    });

    it("ignores malformed keys like q0 or q-1", () => {
      const raw = { q0: "A", "q-1": "B", q99: "C" };
      const ids = ["id-1", "id-2"];
      const result = normalizeAutosaveToSubmitAnswers(raw, ids);
      expect(result).toEqual({});
    });
  });

  describe("normalizeIntegrityEvents", () => {
    const validEvent = (type: string) => ({
      type,
      at: new Date().toISOString(),
      details: { extra: "data" },
    });

    it("accepts all valid integrity event types", () => {
      const types = [
        "exam_opened",
        "fullscreen_enter",
        "fullscreen_exit",
        "fullscreen_error",
        "visibility_hidden",
        "window_blur",
        "window_focus",
        "copy_attempt",
        "paste_attempt",
        "context_menu",
        "before_unload",
      ];

      const events = types.map((type) => validEvent(type));
      const result = normalizeIntegrityEvents(events);
      expect(result).toHaveLength(types.length);
    });

    it("rejects non-array input", () => {
      expect(() =>
        normalizeIntegrityEvents("not an array")
      ).toThrow("events là mảng bắt buộc");
      expect(() => normalizeIntegrityEvents(null)).toThrow(
        "events là mảng bắt buộc"
      );
    });

    it("rejects empty array", () => {
      expect(() => normalizeIntegrityEvents([])).toThrow(
        "events là mảng bắt buộc"
      );
    });

    it("rejects unknown event type", () => {
      const events = [{ type: "unknown_event", at: new Date().toISOString() }];
      expect(() => normalizeIntegrityEvents(events)).toThrow(
        "event.type không hợp lệ"
      );
    });

    it("rejects invalid ISO datetime", () => {
      const events = [{ type: "exam_opened", at: "not-a-date" }];
      expect(() => normalizeIntegrityEvents(events)).toThrow(
        "event.at phải là ISO datetime hợp lệ"
      );
    });

    it("rejects details that exceed 8KB", () => {
      const bigDetails = { data: "x".repeat(9 * 1024) };
      const events = [
        { type: "exam_opened", at: new Date().toISOString(), details: bigDetails },
      ];
      expect(() => normalizeIntegrityEvents(events)).toThrow(
        "event.details vượt quá 8KB"
      );
    });

    it("rejects batch exceeding 200 events", () => {
      const events = Array(201)
        .fill(null)
        .map((_, i) => ({
          type: "exam_opened",
          at: new Date().toISOString(),
          details: { i },
        }));
      expect(() => normalizeIntegrityEvents(events)).toThrow(
        `events vượt quá giới hạn 200`
      );
    });
  });

  describe("submitSessionService validation", () => {
    it("throws 404 if session not found", async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] }); // getSessionById

      await expect(
        submitSessionService("nonexistent-session", "student-id", {})
      ).rejects.toMatchObject({ status: 404 });
    });

    it("throws 403 if studentId does not match session", async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: "session-1",
            student_id: "actual-student",
            exam_id: "exam-1",
            status: "active",
            started_at: new Date().toISOString(),
          },
        ],
      });

      await expect(
        submitSessionService("session-1", "wrong-student", {})
      ).rejects.toMatchObject({ status: 403 });
    });

    it("throws 400 if session already submitted", async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: "session-1",
            student_id: "student-1",
            exam_id: "exam-1",
            status: "submitted",
            started_at: new Date().toISOString(),
          },
        ],
      });

      await expect(
        submitSessionService("session-1", "student-1", {})
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
