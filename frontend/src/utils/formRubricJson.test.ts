import {
  FORM_RUBRIC_JSON_KIND,
  FORM_RUBRIC_JSON_VERSION,
  MAX_IMPORTED_LEVELS,
  MAX_IMPORTED_RUBRICS,
  MAX_LEVEL_DESCRIPTION_LENGTH,
  MAX_RUBRIC_TITLE_LENGTH,
  parseFormRubricImport,
  parseFormRubricImportText,
  serializeFormRubricsExport,
} from "./formRubricJson";
import { TFormRubric } from "types/altForm";

if (typeof globalThis.crypto?.randomUUID !== "function") {
  let seq = 0;
  Object.defineProperty(globalThis, "crypto", {
    value: {
      randomUUID: () => {
        seq += 1;
        return `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
      },
    },
  });
}

const sample: TFormRubric[] = [
  {
    id: "keep-out-1",
    title: "AI를 활용한 내용 학습",
    levels: [
      {
        id: "keep-out-l1",
        label: "우수",
        description: "스스로 학습한다",
        points: 4,
      },
      { id: "keep-out-l2", label: "미흡", description: "", points: 1 },
    ],
  },
];

describe("serializeFormRubricsExport", () => {
  test("omits ids and names the file from the form title", () => {
    const exported = serializeFormRubricsExport("AI 탐구", sample);
    expect(exported).toEqual({
      kind: FORM_RUBRIC_JSON_KIND,
      version: FORM_RUBRIC_JSON_VERSION,
      title: "AI 탐구 루브릭",
      rubrics: [
        {
          title: "AI를 활용한 내용 학습",
          levels: [
            {
              label: "우수",
              description: "스스로 학습한다",
              points: 4,
            },
            { label: "미흡", description: "", points: 1 },
          ],
        },
      ],
    });
    expect(JSON.stringify(exported)).not.toContain("keep-out");
  });
});

describe("parseFormRubricImport", () => {
  test("accepts dedicated JSON and mints new ids", () => {
    const exported = serializeFormRubricsExport("원본", sample);
    const imported = parseFormRubricImport(exported);
    expect(imported).toHaveLength(1);
    expect(imported[0].title).toBe("AI를 활용한 내용 학습");
    expect(imported[0].id).not.toBe("keep-out-1");
    expect(imported[0].levels[0].id).not.toBe("keep-out-l1");
    expect(imported[0].levels.map((l) => l.label)).toEqual(["우수", "미흡"]);
  });

  test("accepts a bare rubric array", () => {
    const imported = parseFormRubricImport([
      {
        title: "통과",
        levels: [{ label: "통과", points: 1 }, { label: "미통과", points: 0 }],
      },
    ]);
    expect(imported).toHaveLength(1);
    expect(imported[0].title).toBe("통과");
    expect(imported[0].levels).toHaveLength(2);
  });

  test("extracts rubrics from a full form export", () => {
    const imported = parseFormRubricImport({
      title: "활동 양식",
      fields: [{ label: "성찰", type: "textarea" }],
      settings: { assessmentMode: true },
      rubrics: [
        {
          id: "form-r1",
          title: "윤리",
          levels: [{ id: "form-l1", label: "책임", points: 3 }],
        },
      ],
    });
    expect(imported).toHaveLength(1);
    expect(imported[0].title).toBe("윤리");
    expect(imported[0].id).not.toBe("form-r1");
    expect(imported[0].levels[0].id).not.toBe("form-l1");
  });

  test("keeps script text as plain strings", () => {
    const imported = parseFormRubricImport([
      {
        title: "<script>alert(1)</script>",
        levels: [
          {
            label: "<img onerror=alert(1)>",
            description: "<b>강조</b>",
            points: 2,
          },
        ],
      },
    ]);
    expect(imported[0].title).toBe("<script>alert(1)</script>");
    expect(imported[0].levels[0].label).toBe("<img onerror=alert(1)>");
    expect(imported[0].levels[0].description).toBe("<b>강조</b>");
  });

  test("appended clones do not share ids with existing rubrics", () => {
    const existing = parseFormRubricImport(serializeFormRubricsExport("A", sample));
    const added = parseFormRubricImport(serializeFormRubricsExport("B", sample));
    expect(existing[0].id).not.toBe(added[0].id);
    expect(existing[0].levels[0].id).not.toBe(added[0].levels[0].id);
    const merged = [...existing, ...added];
    const ids = merged.flatMap((r) => [r.id, ...r.levels.map((l) => l.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("rejects empty and invalid payloads", () => {
    expect(() => parseFormRubricImportText("not-json")).toThrow(
      "JSON 파일이 아닙니다."
    );
    expect(() => parseFormRubricImport({})).toThrow(
      "루브릭 JSON 형식이 아닙니다."
    );
    expect(() => parseFormRubricImport([])).toThrow("가져올 루브릭이 없습니다.");
    expect(() =>
      parseFormRubricImport([{ title: "빈 항목", levels: [] }])
    ).toThrow("가져올 루브릭이 없습니다.");
  });

  test("rejects over-limit rubrics and levels", () => {
    const tooManyRubrics = Array.from({ length: MAX_IMPORTED_RUBRICS + 1 }, () => ({
      title: "r",
      levels: [{ label: "a", points: 1 }],
    }));
    expect(() => parseFormRubricImport(tooManyRubrics)).toThrow(
      `루브릭은 한 번에 ${MAX_IMPORTED_RUBRICS}개까지 가져올 수 있습니다.`
    );
    const tooManyLevels = {
      title: "r",
      levels: Array.from({ length: MAX_IMPORTED_LEVELS + 1 }, (_, i) => ({
        label: `L${i}`,
        points: 1,
      })),
    };
    expect(() => parseFormRubricImport([tooManyLevels])).toThrow(
      `수준은 루브릭당 ${MAX_IMPORTED_LEVELS}개까지 가져올 수 있습니다.`
    );
  });

  test("clips overlong title and description", () => {
    const imported = parseFormRubricImport([
      {
        title: "가".repeat(MAX_RUBRIC_TITLE_LENGTH + 10),
        levels: [
          {
            label: "수준",
            description: "나".repeat(MAX_LEVEL_DESCRIPTION_LENGTH + 10),
            points: 1,
          },
        ],
      },
    ]);
    expect(imported[0].title).toHaveLength(MAX_RUBRIC_TITLE_LENGTH);
    expect(imported[0].levels[0].description).toHaveLength(
      MAX_LEVEL_DESCRIPTION_LENGTH
    );
  });

  test("drops non-finite points", () => {
    const imported = parseFormRubricImport([
      {
        title: "점수",
        levels: [
          { label: "무효", points: Number.NaN },
          { label: "유효", points: 2 },
        ],
      },
    ]);
    expect(imported[0].levels[0].points).toBeUndefined();
    expect(imported[0].levels[1].points).toBe(2);
  });
});
