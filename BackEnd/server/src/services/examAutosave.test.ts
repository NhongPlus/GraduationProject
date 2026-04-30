import { describe, it, expect } from "vitest";
import {
  normalizeAutosaveToSubmitAnswers,
} from "~/services/exam.service";

describe("normalizeAutosaveToSubmitAnswers", () => {
  it("maps direct question-id keys", () => {
    const out = normalizeAutosaveToSubmitAnswers(
      {
        "q-id-1": "A",
        "q-id-2": "Essay answer",
      },
      ["q-id-1", "q-id-2"]
    );

    expect(out).toEqual({
      "q-id-1": "A",
      "q-id-2": "Essay answer",
    });
  });

  it("maps legacy q1, q2 keys by ordered question ids", () => {
    const out = normalizeAutosaveToSubmitAnswers(
      {
        q1: "B",
        q2: "My essay",
        q99: "ignored",
      },
      ["question-1", "question-2"]
    );

    expect(out).toEqual({
      "question-1": "B",
      "question-2": "My essay",
    });
  });

  it("ignores unrelated keys", () => {
    const out = normalizeAutosaveToSubmitAnswers(
      {
        random: "x",
        q0: "invalid",
        q3: "out-of-range",
      },
      ["question-1", "question-2"]
    );

    expect(out).toEqual({});
  });

  it("handles empty question ids array", () => {
    const out = normalizeAutosaveToSubmitAnswers({ q1: "A", q2: "B" }, []);
    expect(out).toEqual({});
  });
});
