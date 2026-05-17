import { describe, expect, it } from "vitest";
import {
  gradeMcq,
  gradeMcqRecompute,
  mcqAnswersEqual,
  pickRecomputeMcqInput,
  resolveOriginalKeyFromDisplay,
} from "./examMcqGrading";

const OPTIONS = {
  A: "HTTP polling mỗi 30 giây",
  B: "WebSocket (Socket.IO)",
  C: "FTP",
  D: "SMTP",
};

const KEY_MAP = { A: "D", B: "A", C: "B", D: "C" };

describe("gradeMcq happy path", () => {
  it("display B, map identity, correct B", () => {
    const r = gradeMcq("B", "B", { A: "A", B: "B", C: "C", D: "D" }, OPTIONS);
    expect(r.isCorrect).toBe(true);
    expect(r.originalKey).toBe("B");
  });

  it("display B maps to original A when correct is A", () => {
    const r = gradeMcq("B", "A", KEY_MAP, OPTIONS);
    expect(r.isCorrect).toBe(true);
    expect(r.originalKey).toBe("A");
  });

  it("display B maps to original A but correct B is wrong", () => {
    const r = gradeMcq("B", "B", KEY_MAP, OPTIONS);
    expect(r.isCorrect).toBe(false);
  });

  it("Socket.IO question: pick B, correct B", () => {
    const r = gradeMcq("B", "B", { A: "A", B: "B", C: "C", D: "D" }, OPTIONS);
    expect(r.isCorrect).toBe(true);
  });
});

describe("resolveOriginalKeyFromDisplay", () => {
  it("maps display B to A via KEY_MAP", () => {
    expect(resolveOriginalKeyFromDisplay("B", KEY_MAP, OPTIONS)).toBe("A");
  });
});

describe("mcqAnswersEqual", () => {
  it("B vs B after unshuffle", () => {
    expect(mcqAnswersEqual("B", "B")).toBe(true);
  });

  it("b vs B case insensitive", () => {
    expect(mcqAnswersEqual("b", "B")).toBe(true);
  });
});

describe("recompute MCQ sources", () => {
  it("when submitted, prefers student original over stale autosave display", () => {
    const input = pickRecomputeMcqInput(
      0,
      "q-uuid",
      { "0": "C" },
      { "q-uuid": "A" },
      "A",
      { preferSubmittedSource: true }
    );
    expect(input).toEqual({ kind: "original", key: "A" });
  });

  it("when not submitted, prefers autosave display for force-submit path", () => {
    const input = pickRecomputeMcqInput(
      0,
      "q-uuid",
      { "0": "B" },
      {},
      undefined,
      { preferSubmittedSource: false }
    );
    expect(input).toEqual({ kind: "display", key: "B" });
  });

  it("uses student original without double option_map", () => {
    const graded = gradeMcqRecompute(
      { kind: "original", key: "A" },
      "A",
      KEY_MAP,
      OPTIONS
    );
    expect(graded.isCorrect).toBe(true);
    expect(graded.originalKey).toBe("A");
  });

  it("original A with gradeMcq+map would wrongly map to D", () => {
    const wrong = gradeMcq("A", "A", KEY_MAP, OPTIONS);
    expect(wrong.isCorrect).toBe(false);
    expect(wrong.originalKey).toBe("D");
  });

  it("display B maps once via gradeMcqRecompute", () => {
    const graded = gradeMcqRecompute(
      { kind: "display", key: "B" },
      "A",
      KEY_MAP,
      OPTIONS
    );
    expect(graded.isCorrect).toBe(true);
    expect(graded.originalKey).toBe("A");
  });
});
