import {
  assertSelectOnly,
  extractReferencedTables,
  ensureLimit,
  stripSqlComments,
  runSelect,
} from "../../src/services/alterSearchSql.js";

describe("alterSearchSql", () => {
  test("rejects non-select and multi-statement SQL", () => {
    expect(() => assertSelectOnly("")).toThrow(/비어/);
    expect(() => assertSelectOnly("DELETE FROM enrollments")).toThrow(/SELECT/);
    expect(() =>
      assertSelectOnly("SELECT 1; SELECT 2")
    ).toThrow(/한 개의 SELECT/);
    expect(() =>
      assertSelectOnly("SELECT * FROM enrollments; DROP TABLE enrollments")
    ).toThrow();
    expect(() =>
      assertSelectOnly("CREATE TABLE x (a TEXT)")
    ).toThrow(/SELECT/);
    expect(() =>
      assertSelectOnly("SELECT * FROM enrollments; ATTACH 'x' AS y")
    ).toThrow();
    expect(() =>
      assertSelectOnly("PRAGMA table_info(enrollments)")
    ).toThrow(/SELECT/);
    expect(() =>
      assertSelectOnly("SELECT * FROM enrollments WHERE class_title = 'drop'")
    ).not.toThrow();
  });

  test("allows a single select and strips comments", () => {
    const sql = assertSelectOnly(`
      -- comment
      SELECT student_name FROM enrollments WHERE has_evaluation = 0
    `);
    expect(sql.toLowerCase()).toMatch(/^select\b/);
    expect(stripSqlComments("SELECT 1 -- x").trim()).toBe("SELECT 1");
  });

  test("ensureLimit appends when missing and clamps oversized LIMIT", () => {
    expect(ensureLimit("SELECT 1", 10)).toBe("SELECT 1 LIMIT 10");
    expect(ensureLimit("SELECT 1 LIMIT 3", 10)).toBe("SELECT 1 LIMIT 3");
    expect(ensureLimit("SELECT 1 LIMIT 50", 10)).toBe("SELECT 1 LIMIT 10");
  });

  test("extractReferencedTables only returns allowed names", () => {
    const allowed = ["enrollments", "syllabi", "archive_행동특성"];
    expect(
      extractReferencedTables(
        'SELECT * FROM enrollments e JOIN syllabi s ON e.syllabus_id = s.id',
        allowed
      )
    ).toEqual(["enrollments", "syllabi"]);
    expect(
      extractReferencedTables(
        'SELECT * FROM "archive_행동특성"',
        allowed
      )
    ).toEqual(["archive_행동특성"]);
    expect(
      extractReferencedTables("SELECT * FROM sqlite_master", allowed)
    ).toEqual([]);
  });

  test("runSelect executes SELECT against in-memory tables", async () => {
    const result = await runSelect(
      "SELECT student_name, point FROM enrollments WHERE point >= 2 ORDER BY student_name",
      [
        {
          name: "enrollments",
          columns: ["student_name", "point"],
          rows: [
            { student_name: "김학생", point: 3 },
            { student_name: "이학생", point: 1 },
          ],
        },
      ]
    );
    expect(result.columns).toEqual(["student_name", "point"]);
    expect(result.rows).toEqual([{ student_name: "김학생", point: 3 }]);
    expect(result.rowCount).toBe(1);
  });

  test("runSelect supports JOIN and GROUP BY", async () => {
    const result = await runSelect(
      `SELECT s.class_title, COUNT(*) AS n
       FROM enrollments e
       JOIN syllabi s ON e.syllabus_id = s.id
       GROUP BY s.class_title
       ORDER BY n DESC`,
      [
        {
          name: "enrollments",
          columns: ["syllabus_id", "student_name"],
          rows: [
            { syllabus_id: "a", student_name: "김" },
            { syllabus_id: "a", student_name: "이" },
            { syllabus_id: "b", student_name: "박" },
          ],
        },
        {
          name: "syllabi",
          columns: ["id", "class_title"],
          rows: [
            { id: "a", class_title: "수학" },
            { id: "b", class_title: "영어" },
          ],
        },
      ]
    );
    expect(result.rows[0]).toEqual({ class_title: "수학", n: 2 });
    expect(result.rows[1]).toEqual({ class_title: "영어", n: 1 });
  });

  test("runSelect groups flattened 성취도 and counts distinct students", async () => {
    const result = await runSelect(
      `SELECT "성취도", COUNT(*) AS enrollments, COUNT(DISTINCT student_id) AS students
       FROM enrollment_evaluations
       GROUP BY "성취도"
       ORDER BY "성취도"`,
      [
        {
          name: "enrollment_evaluations",
          columns: ["student_id", "성취도"],
          rows: [
            { student_id: "s1", 성취도: "A" },
            { student_id: "s1", 성취도: "A" },
            { student_id: "s2", 성취도: "B" },
            { student_id: "s3", 성취도: "A" },
          ],
        },
      ]
    );
    expect(result.rows).toEqual([
      { 성취도: "A", enrollments: 3, students: 2 },
      { 성취도: "B", enrollments: 1, students: 1 },
    ]);
  });

  test("runSelect groups flattened form field 컴퓨터", async () => {
    const result = await runSelect(
      `SELECT "컴퓨터", COUNT(*) AS n
       FROM form_컴퓨터_신청
       GROUP BY "컴퓨터"
       ORDER BY "컴퓨터"`,
      [
        {
          name: "form_컴퓨터_신청",
          columns: ["컴퓨터"],
          rows: [
            { 컴퓨터: "신청" },
            { 컴퓨터: "신청" },
            { 컴퓨터: "미신청" },
          ],
        },
      ]
    );
    expect(result.rows).toEqual([
      { 컴퓨터: "미신청", n: 1 },
      { 컴퓨터: "신청", n: 2 },
    ]);
  });

  test("runSelect SUM CAST of TEXT hours is exact", async () => {
    const result = await runSelect(
      'SELECT SUM(CAST("시간" AS REAL)) AS total FROM archive',
      [
        {
          name: "archive",
          columns: ["시간"],
          rows: [2, 7, 3, 16, 7, 4, 9, 3, 8, 6, 5].map((n) => ({
            시간: String(n),
          })),
        },
      ]
    );
    expect(result.rows[0].total).toBe(70);
  });
});
