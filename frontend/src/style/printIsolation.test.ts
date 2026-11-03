import { readFileSync } from "fs";
import { join } from "path";

/**
 * 결재 목록(sticky 표)이 인쇄 루트 밖에 남으면 행 수만큼 빈 쪽이 생긴다.
 * 격리 규칙이 빠지면 그 증상이 돌아온다.
 */
describe("print isolation", () => {
  const globalCss = readFileSync(join(__dirname, "global.scss"), "utf8");
  const sheetCss = readFileSync(
    join(__dirname, "../pages/boards/altBoard/altBoard.module.scss"),
    "utf8"
  );

  test("hides body siblings of the print root", () => {
    const rule = globalCss.match(
      /body\.altsis-printing > \*:not\(\[data-print-root\]\)\s*\{[^}]*\}/
    );
    expect(rule?.[0]).toMatch(/display:\s*none\s*!important/);
  });

  test("clears sticky sheet headers while printing", () => {
    const printAt = sheetCss.indexOf("@media print {");
    expect(printAt).toBeGreaterThan(-1);
    const printCss = sheetCss.slice(printAt);
    expect(printCss).toMatch(
      /\.sheetTable th\s*\{[^}]*position:\s*static\s*!important/
    );
  });
});
