import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSessionReview,
  submitSessionService,
  normalizeAutosaveToSubmitAnswers,
  normalizeIntegrityEvents,
} from "~/services/exam.service";

vi.mock("~/config/db", () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from "~/config/db";
const mockedPool = pool as any;

// ─── getSessionReview tests ───────────────────────────────────────────────

describe("getSessionReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 404 if session not found", async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [] }); // getSessionById

    await expect(
      getSessionReview("nonexistent-session", "student-1")
    ).rejects.toMatchObject({ status: 404, message: "Không tìm thấy phiên thi" });
  });

  it("throws 403 if session belongs to different student", async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [{ id: "session-1", student_id: "other-student", status: "submitted" }],
    });

    await expect(
      getSessionReview("session-1", "my-student")
    ).rejects.toMatchObject({ status: 403, message: "Không có quyền xem bài này" });
  });

  it("throws 400 if session is still active", async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [{ id: "session-1", student_id: "my-student", status: "active" }],
    });

    await expect(
      getSessionReview("session-1", "my-student")
    ).rejects.toMatchObject({
      status: 400,
      message: "Phiên thi chưa kết thúc — hãy nộp bài trước khi xem kết quả",
    });
  });

  it("returns full review payload when session is submitted", async () => {
    const mockSession = {
      id: "session-1",
      student_id: "my-student",
      exam_id: "exam-1",
      status: "submitted",
      score: 8,
      max_points: 10,
      grading_status: "complete",
      graded_details: [
        {
          question_id: "q1",
          question_type: "mcq",
          submitted: "A",
          is_correct: true,
          points_earned: 2,
          max_points: 2,
        },
        {
          question_id: "q2",
          question_type: "mcq",
          submitted: "C",
          is_correct: false,
          points_earned: 0,
          max_points: 2,
        },
      ],
    };

    const mockExam = {
      id: "exam-1",
      title: "Midterm Exam",
      description: null,
      class_id: "class-1",
      created_by: "teacher-1",
      duration_min: 60,
      closes_at: null,
      created_at: new Date().toISOString(),
    };

    const mockQuestions = [
      {
        id: "q1",
        exam_id: "exam-1",
        content: "What is 2+2?",
        question_type: "mcq",
        options: { A: "3", B: "4", C: "5", D: "6" },
        correct_answer: "B",
        media_url: null,
        points: 2,
        display_order: 1,
        created_at: new Date().toISOString(),
        explanation: "2+2 equals 4",
      },
      {
        id: "q2",
        exam_id: "exam-1",
        content: "What is 3+3?",
        question_type: "mcq",
        options: { A: "5", B: "6", C: "7", D: "8" },
        correct_answer: "B",
        media_url: null,
        points: 2,
        display_order: 2,
        created_at: new Date().toISOString(),
        explanation: null,
      },
    ];

    mockedPool.query
      .mockResolvedValueOnce({ rows: [mockSession] }) // getSessionById
      .mockResolvedValueOnce({ rows: [mockExam] }) // getExamById
      .mockResolvedValueOnce({ rows: mockQuestions }); // getQuestionsByExam

    const result = await getSessionReview("session-1", "my-student");

    expect(result.session.id).toBe("session-1");
    expect(result.score).toBe(8);
    expect(result.max_points).toBe(10);
    expect(result.grading_status).toBe("complete");
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].explanation).toBe("2+2 equals 4");
    expect(result.questions[1].explanation).toBeNull();
    expect(result.questions[0].is_correct).toBe(true);
    expect(result.questions[1].is_correct).toBe(false);
  });
});

// ─── submitSessionService: deadline edge-case tests ─────────────────────────

describe("submitSessionService deadline edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 400 when past deadline without allowPastDeadline flag", async () => {
    const startedAt = new Date(Date.now() - 120 * 60 * 1000); // 120 min ago
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: "session-1",
          student_id: "student-1",
          exam_id: "exam-1",
          status: "active",
          started_at: startedAt.toISOString(),
        },
      ],
    });

    await expect(
      submitSessionService("session-1", "student-1", {})
    ).rejects.toMatchObject({ status: 400, message: "Đã hết thời gian làm bài" });
  });

  it("allows submission past deadline when allowPastDeadline=true", async () => {
    const startedAt = new Date(Date.now() - 120 * 60 * 1000);
    const mockSession = {
      id: "session-1",
      student_id: "student-1",
      exam_id: "exam-1",
      status: "active",
      started_at: startedAt.toISOString(),
    };

    mockedPool.query
      .mockResolvedValueOnce({ rows: [mockSession] }) // getSessionById
      .mockResolvedValueOnce({ rows: [{ ...mockSession, status: "submitted" }] }); // finalizeSessionSubmit

    // Mock exam lookup and questions
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: "exam-1",
          title: "Test",
          description: null,
          class_id: "class-1",
          created_by: "teacher-1",
          duration_min: 60,
          closes_at: null,
          created_at: new Date().toISOString(),
        },
      ],
    });
    mockedPool.query.mockResolvedValueOnce({ rows: [] }); // getQuestionsByExam
    mockedPool.query.mockResolvedValueOnce({ rows: [] }); // getVersionByIndex
    mockedPool.query.mockResolvedValueOnce({ rows: [] }); // update session

    const result = await submitSessionService(
      "session-1",
      "student-1",
      {},
      { allowPastDeadline: true }
    );

    expect(result.session.status).toBe("submitted");
  });
});

// ─── normalizeAutosaveToSubmitAnswers: additional coverage ─────────────────

describe("normalizeAutosaveToSubmitAnswers extra cases", () => {
  it("handles mixed direct keys and legacy keys", () => {
    const raw = {
      "direct-q1": "A",
      q2: "B",
      q3: "C",
      "direct-q4": "D",
    };
    const ids = ["direct-q1", "second-id", "third-id", "direct-q4"];
    const result = normalizeAutosaveToSubmitAnswers(raw, ids);
    expect(result).toEqual({
      "direct-q1": "A",
      second_id: "B", // this won't match since q2 maps to second-id by index
      third_id: "C",
      "direct-q4": "D",
    });
  });

  it("filters out non-string values", () => {
    const raw = {
      "q1": "A",
      "q2": null,
      "q3": ["array", "not", "string"],
    } as any;
    const ids = ["id1", "id2", "id3"];
    const result = normalizeAutosaveToSubmitAnswers(raw, ids);
    expect(result).toEqual({ id1: "A" });
  });
});

// ─── normalizeIntegrityEvents: extra coverage ───────────────────────────────

describe("normalizeIntegrityEvents extra cases", () => {
  it("accepts event with null details", () => {
    const events = [{ type: "exam_opened", at: new Date().toISOString(), details: null }];
    const result = normalizeIntegrityEvents(events);
    expect(result).toHaveLength(1);
    expect(result[0].details).toBeNull();
  });

  it("accepts event with no details key at all", () => {
    const events = [{ type: "window_blur", at: new Date().toISOString() }];
    const result = normalizeIntegrityEvents(events);
    expect(result).toHaveLength(1);
  });

  it("rejects event with details as array (must be object)", () => {
    const events = [{ type: "exam_opened", at: new Date().toISOString(), details: ["array"] }];
    expect(() => normalizeIntegrityEvents(events)).toThrow("event.details phải là object");
  });

  it("rejects event with details as string", () => {
    const events = [{ type: "exam_opened", at: new Date().toISOString(), details: "string" }];
    expect(() => normalizeIntegrityEvents(events)).toThrow("event.details phải là object");
  });
});