import {
  PASTE_FILTER_ALL,
  filterPasteSyllabuses,
  formatPasteOwnerLabel,
  toSelectOptions,
  uniqueTerms,
  uniqueYears,
} from "./pasteSyllabusFilter";

const rows = [
  {
    year: "2026학년도",
    term: "1학기",
    classTitle: "기숙사임원",
    userName: "조은길",
    subject: ["국어", "국어"],
  },
  {
    year: "2026학년도",
    term: "2쿼터",
    classTitle: "10학년 정보 A반",
    userName: "박선생",
    subject: ["정보미디어", "프로그래밍 기초"],
  },
  {
    year: "테스트",
    term: "3쿼터",
    classTitle: "리더십",
    userName: "김선생",
    subject: ["교양", "리더십과 커뮤니케이션"],
  },
];

describe("uniqueYears / uniqueTerms", () => {
  test("years are unique and descending", () => {
    expect(uniqueYears(rows)).toEqual(["테스트", "2026학년도"]);
  });

  test("terms follow selected year", () => {
    expect(uniqueTerms(rows, "2026학년도")).toEqual(["1학기", "2쿼터"]);
    expect(uniqueTerms(rows, "")).toEqual(["1학기", "2쿼터", "3쿼터"]);
  });
});

describe("toSelectOptions", () => {
  test("prepends 전체 and optional extra year", () => {
    expect(toSelectOptions(["2026학년도"], "2027학년도")).toEqual([
      { text: "전체", value: PASTE_FILTER_ALL },
      { text: "2027학년도", value: "2027학년도" },
      { text: "2026학년도", value: "2026학년도" },
    ]);
  });
});

describe("filterPasteSyllabuses", () => {
  test("empty keyword and filters returns all", () => {
    expect(
      filterPasteSyllabuses({
        syllabuses: rows,
        year: "",
        term: "",
        keyword: "  ",
      })
    ).toHaveLength(3);
  });

  test("filters by year and term", () => {
    expect(
      filterPasteSyllabuses({
        syllabuses: rows,
        year: "2026학년도",
        term: "1학기",
        keyword: "",
      }).map((s) => s.classTitle)
    ).toEqual(["기숙사임원"]);
  });

  test("keyword matches classTitle, userName, or subject", () => {
    expect(
      filterPasteSyllabuses({
        syllabuses: rows,
        year: "",
        term: "",
        keyword: "정보",
      }).map((s) => s.classTitle)
    ).toEqual(["10학년 정보 A반"]);
    expect(
      filterPasteSyllabuses({
        syllabuses: rows,
        year: "",
        term: "",
        keyword: "김선생",
      }).map((s) => s.classTitle)
    ).toEqual(["리더십"]);
    expect(
      filterPasteSyllabuses({
        syllabuses: rows,
        year: "",
        term: "",
        keyword: "국어",
      }).map((s) => s.classTitle)
    ).toEqual(["기숙사임원"]);
  });
});

describe("formatPasteOwnerLabel", () => {
  test("appends (나) for the current user", () => {
    expect(formatPasteOwnerLabel("조은길", "u1", "u1")).toBe("조은길 (나)");
    expect(formatPasteOwnerLabel("박선생", "u2", "u1")).toBe("박선생");
  });
});
