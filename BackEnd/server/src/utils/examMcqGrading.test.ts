import { describe, expect, it } from "vitest";
import { mcqAnswersEqual, resolveMcqAnswerKey } from "./examMcqGrading";

const OPTIONS = {
  A: "HTTP polling mỗi 30 giây",
  B: "WebSocket (Socket.IO)",
  C: "FTP",
  D: "SMTP",
};

describe("resolveMcqAnswerKey", () => {
  it("accepts letter B", () => {
    expect(resolveMcqAnswerKey("B", OPTIONS)).toBe("B");
  });

  it("maps option text to letter", () => {
    expect(resolveMcqAnswerKey("WebSocket (Socket.IO)", OPTIONS)).toBe("B");
  });
});

describe("mcqAnswersEqual", () => {
  it("B vs B is correct", () => {
    expect(mcqAnswersEqual("B", "B", OPTIONS)).toBe(true);
  });

  it("B vs option text for B is correct", () => {
    expect(mcqAnswersEqual("B", "WebSocket (Socket.IO)", OPTIONS)).toBe(true);
  });
});
