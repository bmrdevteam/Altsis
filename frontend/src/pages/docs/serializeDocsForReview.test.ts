import { serializeDocsForReview } from "./serializeDocsForReview";

const schoolId = "school-a";

const dbData = {
  [schoolId]: {
    archive: {
      인적사항: { 성명: "권시은", 성별: "여", 주민번호: "숨김값" },
      출결사항: { "1학년/결석": 0 },
    },
    evaluation: [
      {
        학년도: "2024",
        학년: "10",
        교과: "국어",
        과목: "문학",
        "1학기/성취도": "A",
        "1학기/자기평가": "화면에 없는 자기평가",
      },
    ],
  },
};

const formShowingOnlyVisibleFields = {
  title: "학교생활세부사항기록부",
  data: [
    {
      type: "table",
      data: {
        table: [
          [
            {
              type: "data",
              dataText: [
                {
                  tag: "DATA",
                  location: `${schoolId}//archive//인적사항//성명`,
                },
              ],
            },
            {
              type: "data",
              dataText: [
                {
                  tag: "DATA",
                  location: `${schoolId}//archive//인적사항//성별`,
                },
              ],
            },
          ],
        ],
      },
    },
    {
      type: "table",
      data: {
        dataRepeat: { by: `${schoolId}//evaluation`, max: 10 },
        table: [
          [
            {
              type: "data",
              dataText: [
                { tag: "DATA", location: `${schoolId}//evaluation//학년도` },
              ],
            },
            {
              type: "data",
              dataText: [
                {
                  tag: "DATA",
                  location: `${schoolId}//evaluation//1학기/성취도`,
                },
              ],
            },
          ],
        ],
      },
    },
  ],
};

describe("serializeDocsForReview", () => {
  test("only serializes fields bound in the selected form", () => {
    const snap = serializeDocsForReview({
      formTitle: "학교생활세부사항기록부",
      studentLabel: "권시은 · 12학년",
      formData: formShowingOnlyVisibleFields,
      dbData,
    });

    expect(snap.title).toContain("학교생활세부사항기록부");
    expect(snap.content).toContain("성명: 권시은");
    expect(snap.content).toContain("성별: 여");
    expect(snap.content).toContain("1학기/성취도: A");
    expect(snap.content).not.toContain("주민번호");
    expect(snap.content).not.toContain("자기평가");
    expect(snap.content).not.toContain("화면에 없는");
  });

  test("applies evaluation row filters from the form", () => {
    const formWithFilter = {
      data: [
        {
          type: "table",
          data: {
            dataRepeat: { by: `${schoolId}//evaluation` },
            dataFilter: [{ by: "과목", operator: "===", value: "문학" }],
            table: [
              [
                {
                  type: "data",
                  dataText: [
                    {
                      tag: "DATA",
                      location: `${schoolId}//evaluation//1학기/성취도`,
                    },
                  ],
                },
              ],
            ],
          },
        },
      ],
    };
    const snap = serializeDocsForReview({
      formTitle: "문서",
      formData: formWithFilter,
      dbData: {
        [schoolId]: {
          archive: {},
          evaluation: [
            {
              학년도: "2024",
              과목: "문학",
              "1학기/성취도": "A",
              "1학기/자기평가": "숨김",
            },
            {
              학년도: "2024",
              과목: "수학",
              "1학기/성취도": "B",
              "1학기/자기평가": "숨김2",
            },
          ],
        },
      },
    });
    expect(snap.content).toContain("1학기/성취도: A");
    expect(snap.content).not.toContain("1학기/성취도: B");
    expect(snap.content).not.toContain("자기평가");
  });

  test("handles missing form template without dumping full db", () => {
    const snap = serializeDocsForReview({
      formTitle: "문서",
      dbData,
    });
    expect(snap.content).toContain("인쇄 양식이 없어");
    expect(snap.content).not.toContain("자기평가");
    expect(snap.content).not.toContain("성명: 권시은");
  });
});
