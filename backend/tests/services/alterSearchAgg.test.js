import {
  formatAggregateNote,
  formatAggNumber,
  formatFallbackTotals,
  parseNumericCell,
  summarizeNumericColumns,
} from "../../src/services/alterSearchAgg.js";
import {
  buildSqlPrompt,
  buildSummaryPrompt,
} from "../../src/services/alterSearch.js";

describe("alterSearchAgg", () => {
  test("parseNumericCell accepts numbers, text digits, and hour suffixes", () => {
    expect(parseNumericCell(7)).toBe(7);
    expect(parseNumericCell("16")).toBe(16);
    expect(parseNumericCell("7시간")).toBe(7);
    expect(parseNumericCell("3.5시간")).toBe(3.5);
    expect(parseNumericCell("1,200")).toBe(1200);
    expect(parseNumericCell("")).toBeNull();
    expect(parseNumericCell("2026학년도")).toBeNull();
    expect(parseNumericCell("2024-03-01")).toBeNull();
    expect(parseNumericCell(true)).toBeNull();
  });

  test("formatAggNumber avoids float noise and negative zero", () => {
    expect(formatAggNumber(70)).toBe("70");
    expect(formatAggNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatAggNumber(-0)).toBe("0");
  });

  test("summarizeNumericColumns sums 시간 from text cells (69 vs 70 case)", () => {
    const hours = [2, 7, 3, 16, 7, 4, 9, 3, 8, 6, 5];
    expect(hours.reduce((a, b) => a + b, 0)).toBe(70);
    const rows = hours.map((n, i) => ({
      학년: i < 5 ? "10학년" : "11학년",
      "일자 또는 기간": `2024-0${(i % 9) + 1}-01`,
      시간: String(n),
    }));
    const stats = summarizeNumericColumns(
      ["학년", "일자 또는 기간", "시간"],
      rows
    );
    expect(stats).toHaveLength(1);
    expect(stats[0].column).toBe("시간");
    expect(stats[0].count).toBe(11);
    expect(stats[0].sum).toBe(70);
    expect(formatAggregateNote(stats, { rowCount: 11 })).toMatch(/합=70/);
    expect(formatFallbackTotals(stats)).toMatch(/시간 합계 70/);
  });

  test("skips id, date, grade, and year-like columns", () => {
    const rows = [
      {
        user_id: "100001",
        학년: "10학년",
        year: "2026",
        점수: "4",
      },
      {
        user_id: "100002",
        학년: "11학년",
        year: "2025",
        점수: "6",
      },
    ];
    const stats = summarizeNumericColumns(
      ["user_id", "학년", "year", "점수"],
      rows
    );
    expect(stats.map((s) => s.column)).toEqual(["점수"]);
    expect(stats[0].sum).toBe(10);
  });

  test("skips mixed text columns that are not numeric hints", () => {
    const rows = [
      { 활동내용: "도서관 정리", 횟수: "2" },
      { 활동내용: "캠페인", 횟수: "3" },
    ];
    const stats = summarizeNumericColumns(["활동내용", "횟수"], rows);
    expect(stats.map((s) => s.column)).toEqual(["횟수"]);
    expect(stats[0].sum).toBe(5);
  });

  test("buildSummaryPrompt includes server aggregates and forbids re-adding", () => {
    const note = formatAggregateNote(
      summarizeNumericColumns(
        ["시간"],
        [{ 시간: "2" }, { 시간: "7" }, { 시간: "61" }]
      ),
      { rowCount: 3 }
    );
    const prompt = buildSummaryPrompt({
      message: "권시은 봉사 총 시간",
      sql: 'SELECT "시간" FROM archive',
      columns: ["시간"],
      rows: [{ 시간: "2" }, { 시간: "7" }, { 시간: "61" }],
      rowCount: 3,
      truncated: false,
      wantViz: false,
      aggregateNote: note,
    });
    expect(prompt).toMatch(/확정 계산/);
    expect(prompt).toMatch(/합=70/);
    expect(prompt).toMatch(/표본을 다시 더하거나 어림하지 마세요/);
    expect(prompt).toMatch(/코드 펜스는 넣지 마세요/);
  });

  test("buildSqlPrompt tells the model to CAST text hours and leave list sums to the server", () => {
    const prompt = buildSqlPrompt({
      ddl: "CREATE TABLE archive (\"시간\" TEXT);",
      message: "권시은 봉사 총 시간",
      seasonNote: "범위: 활성 학기 전부",
    });
    expect(prompt).toMatch(/SUM\(CAST\("시간" AS REAL\)\)/);
    expect(prompt).toMatch(/합·평균은 서버가 계산합니다/);
  });

  test("formatAggregateNote mentions truncation and empty stats stay blank", () => {
    expect(formatAggregateNote([])).toBe("");
    expect(formatFallbackTotals([])).toBe("");
    const note = formatAggregateNote(
      [{ column: "시간", count: 2, skipped: 0, sum: 9, avg: 4.5, min: 2, max: 7 }],
      { rowCount: 2, truncated: true }
    );
    expect(note).toMatch(/저장된 행만/);
    expect(note).toMatch(/합=9/);
  });
});
