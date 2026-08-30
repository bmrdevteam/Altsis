import {
  canCountInMongo,
  extractPushdownFilters,
  extractTableAliases,
  mergeQueryAnd,
  normalizeSeasonScope,
  parseSimpleCountTable,
  pickResolvedSeasonIds,
  whereHasOr,
} from "../../src/services/alterSearchPushdown.js";

describe("alterSearchPushdown", () => {
  test("normalizeSeasonScope maps legacy school/archive to activated", () => {
    expect(normalizeSeasonScope("current")).toBe("current");
    expect(normalizeSeasonScope("season")).toBe("season");
    expect(normalizeSeasonScope("activated")).toBe("activated");
    expect(normalizeSeasonScope("school")).toBe("activated");
    expect(normalizeSeasonScope("archive")).toBe("activated");
    expect(normalizeSeasonScope("")).toBe("current");
  });

  test("pickResolvedSeasonIds only allows activated ids", () => {
    const currentId = "cur";
    const activatedIds = ["a1", "a2"];
    expect(
      pickResolvedSeasonIds({
        scope: "current",
        currentId,
        activatedIds,
      })
    ).toEqual(["cur"]);
    expect(
      pickResolvedSeasonIds({
        scope: "activated",
        currentId,
        activatedIds,
      })
    ).toEqual(["a1", "a2"]);
    expect(
      pickResolvedSeasonIds({
        scope: "season",
        currentId,
        activatedIds,
        requestedId: "a2",
      })
    ).toEqual(["a2"]);
    expect(
      pickResolvedSeasonIds({
        scope: "season",
        currentId,
        activatedIds,
        requestedId: "inactive",
      })
    ).toEqual(["cur"]);
  });

  test("mergeQueryAnd keeps permission $or and adds filters", () => {
    const merged = mergeQueryAnd(
      { season: { $in: ["s1"] }, $or: [{ user: "u1" }, { role: "teacher" }] },
      { grade: "12학년" },
      { userName: "권시은" }
    );
    expect(merged.$and).toHaveLength(3);
    expect(merged.$and[0].$or).toEqual([{ user: "u1" }, { role: "teacher" }]);
    expect(merged.$and[1]).toEqual({ grade: "12학년" });
  });

  test("extracts equality and IN with aliases", () => {
    const filters = extractPushdownFilters(
      "SELECT * FROM enrollments e WHERE e.student_name = '권시은' AND year IN ('2026학년도')"
    );
    expect(filters.enrollments).toEqual({
      studentName: "권시은",
      year: "2026학년도",
    });
  });

  test("skips OR predicates", () => {
    expect(
      whereHasOr("SELECT * FROM enrollments WHERE student_name = 'a' OR year = 'b'")
    ).toBe(true);
    expect(
      extractPushdownFilters(
        "SELECT * FROM enrollments WHERE student_name = 'a' OR year = 'b'"
      )
    ).toEqual({});
  });

  test("does not map unknown columns", () => {
    expect(
      extractPushdownFilters(
        "SELECT * FROM enrollments WHERE password = 'x' AND student_name = '권시은'"
      )
    ).toEqual({ enrollments: { studentName: "권시은" } });
  });

  test("parseSimpleCountTable rejects join and group by", () => {
    expect(parseSimpleCountTable("SELECT COUNT(*) FROM enrollments")).toBe(
      "enrollments"
    );
    expect(
      parseSimpleCountTable(
        "SELECT COUNT(*) FROM enrollments WHERE student_name = '권시은'"
      )
    ).toBe("enrollments");
    expect(
      parseSimpleCountTable(
        "SELECT COUNT(*) FROM enrollments e JOIN syllabi s ON e.syllabus_id = s.id"
      )
    ).toBeNull();
    expect(
      parseSimpleCountTable(
        "SELECT student_grade, COUNT(*) FROM enrollments GROUP BY student_grade"
      )
    ).toBeNull();
  });

  test("canCountInMongo requires fully pushable where", () => {
    expect(
      canCountInMongo("SELECT COUNT(*) FROM enrollments", "enrollments")
    ).toBe(true);
    expect(
      canCountInMongo(
        "SELECT COUNT(*) FROM enrollments WHERE student_name = '권시은'",
        "enrollments"
      )
    ).toBe(true);
    expect(
      canCountInMongo(
        "SELECT COUNT(*) FROM enrollments WHERE point > 2",
        "enrollments"
      )
    ).toBe(false);
  });

  test("extracts respondent_name from form_* tables", () => {
    const filters = extractPushdownFilters(
      'SELECT * FROM "form_컴퓨터_신청" WHERE respondent_name = \'권시은\''
    );
    expect(filters["form_컴퓨터_신청"]).toEqual({
      _respondentName: "권시은",
    });
  });

  test("extractTableAliases reads quoted archive tables", () => {
    const { tables } = extractTableAliases(
      'SELECT * FROM "archive_행동특성" a'
    );
    expect(tables).toEqual(["archive_행동특성"]);
  });
});
