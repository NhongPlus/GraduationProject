import { describe, expect, it } from "vitest";
import {
  buildSubjectImportTemplateBuffer,
  parseSubjectImportExcel,
} from "./subjectImport.service";

describe("subjectImport.service", () => {
  it("builds non-empty template xlsx", () => {
    const buf = buildSubjectImportTemplateBuffer();
    expect(buf.length).toBeGreaterThan(100);
  });

  it("parses rows with ten_mon column", () => {
    const template = buildSubjectImportTemplateBuffer();
    const rows = parseSubjectImportExcel(template);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows[0]?.name).toBe("Lập trình C");
    expect(rows[0]?.status).toBe("ok");
  });
});
