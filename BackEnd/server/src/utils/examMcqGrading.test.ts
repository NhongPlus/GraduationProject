import { describe, expect, it } from "vitest";
import { gradeMcq, mcqAnswersEqual, resolveOriginalKeyFromDisplay } from "./examMcqGrading";

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
