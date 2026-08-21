import {
  buildFormDraftDataCatalog,
  compactFormSnapshot,
  FORM_DRAFT_MAX_COLS,
  FORM_DRAFT_MAX_ROWS,
  FORM_DRAFT_TEXT_CHARS,
  normalizeFormDraft,
  parseFormDraftResponse,
} from "../../src/services/formDraft.js";

describe("parseFormDraftResponse", () => {
  test("parses <<<JSON>>> create blocks", () => {
    const parsed = parseFormDraftResponse(`<<<JSON>>>
{
  "writeMode": "create",
  "formType": "timetable",
  "title": "시간표",
  "blocks": [
    { "id": "b1", "type": "paragraph", "data": { "text": "안내" } }
  ]
}
<<<END>>>`);
    expect(parsed.title).toBe("시간표");
    expect(parsed.blocks).toHaveLength(1);
  });
});

describe("normalizeFormDraft", () => {
  test("drops unknown DATA locations", () => {
    const allowed = new Set(["bmr//archive//인적 사항//성명"]);
    const draft = normalizeFormDraft(
      {
        writeMode: "create",
        formType: "print",
        title: "출력",
        blocks: [
          {
            type: "table",
            data: {
              table: [
                [
                  {
                    type: "data",
                    dataText: [
                      { tag: "DATA", location: "bmr//archive//인적 사항//성명" },
                      { tag: "DATA", location: "evil//secret" },
                    ],
                  },
                ],
              ],
            },
          },
        ],
      },
      { formType: "print", allowedLocations: allowed }
    );
    const cell = draft.blocks[0].data.table[0][0];
    expect(cell.dataText).toEqual([
      { tag: "DATA", location: "bmr//archive//인적 사항//성명" },
    ]);
  });

  test("caps table size", () => {
    const row = Array.from({ length: 20 }, () => ({
      type: "paragraph",
      data: { text: "x" },
    }));
    const table = Array.from({ length: 40 }, () => row);
    const draft = normalizeFormDraft(
      {
        formType: "timetable",
        blocks: [{ type: "table", data: { table } }],
      },
      { formType: "timetable" }
    );
    expect(draft.blocks[0].data.table).toHaveLength(FORM_DRAFT_MAX_ROWS);
    expect(draft.blocks[0].data.table[0]).toHaveLength(FORM_DRAFT_MAX_COLS);
  });

  test("keeps allowed cell styles and drops unsafe CSS", () => {
    const draft = normalizeFormDraft(
      {
        formType: "syllabus",
        blocks: [
          {
            type: "table",
            data: {
              table: [
                [
                  {
                    type: "paragraph",
                    data: { text: "헤더" },
                    backgroundColor: "#eef2ff",
                    fontWeight: 700,
                    fontSize: "16px",
                    align: "center",
                    isHeader: true,
                  },
                  {
                    type: "paragraph",
                    data: { text: "위험" },
                    backgroundColor: "url(javascript:alert(1))",
                    fontFamily: "Comic Sans",
                  },
                ],
              ],
            },
          },
        ],
      },
      { formType: "syllabus" }
    );
    const [header, unsafe] = draft.blocks[0].data.table[0];
    expect(header.backgroundColor).toBe("#eef2ff");
    expect(header.fontWeight).toBe(700);
    expect(header.fontSize).toBe("16px");
    expect(header.align).toBe("center");
    expect(header.isHeader).toBe(true);
    expect(unsafe.backgroundColor).toBeUndefined();
    expect(unsafe.fontFamily).toBeUndefined();
  });

  test("clips cell text to FORM_DRAFT_TEXT_CHARS", () => {
    const long = "가".repeat(FORM_DRAFT_TEXT_CHARS + 80);
    const draft = normalizeFormDraft(
      {
        formType: "syllabus",
        blocks: [
          { type: "paragraph", data: { text: long } },
        ],
      },
      { formType: "syllabus" }
    );
    expect(draft.blocks[0].data.text).toHaveLength(FORM_DRAFT_TEXT_CHARS);
  });

  test("refine keeps syllabus input ids and drops unknown blocks", () => {
    const currentBlocks = [
      {
        id: "keep",
        type: "table",
        data: {
          columns: [1],
          table: [
            [{ id: "goal-1", type: "input", name: "목표", data: { text: "" } }],
          ],
        },
      },
    ];
    const draft = normalizeFormDraft(
      {
        writeMode: "refine",
        ops: [
          {
            op: "updateCell",
            blockId: "keep",
            row: 0,
            col: 0,
            patch: { id: "hacked", placeholder: "작성" },
          },
          {
            op: "updateCell",
            blockId: "missing",
            row: 0,
            col: 0,
            patch: { data: { text: "x" } },
          },
        ],
      },
      { formType: "syllabus", writeMode: "refine", currentBlocks }
    );
    expect(draft.writeMode).toBe("refine");
    expect(draft.ops).toHaveLength(1);
    expect(draft.ops[0].patch.id).toBeUndefined();
    expect(draft.ops[0].patch.placeholder).toBe("작성");
  });
});

describe("buildFormDraftDataCatalog", () => {
  test("builds archive and evaluation locations", () => {
    const catalog = buildFormDraftDataCatalog(
      {
        schoolId: "bmr",
        schoolName: "별무리",
        formArchive: [
          {
            label: "인적 사항",
            fields: [
              { label: "성명" },
              { label: "점수", total: true, runningTotal: true },
            ],
          },
        ],
      },
      [
        {
          term: "1학기",
          subjects: { label: ["국어"] },
          formEvaluation: [{ label: "멘토평가", combineBy: "term" }],
        },
      ]
    );
    expect(catalog.allowedLocations.has("bmr//archive//인적 사항//성명")).toBe(
      true
    );
    expect(
      catalog.allowedLocations.has("bmr//archive//인적 사항//점수[합산]")
    ).toBe(true);
    expect(catalog.allowedRepeatBy.has("bmr//evaluation")).toBe(true);
    expect(catalog.allowedLocations.has("bmr//evaluation//1학기/멘토평가")).toBe(
      true
    );
  });
});

describe("compactFormSnapshot", () => {
  test("keeps cell style whitelist and omits block style dump", () => {
    const compact = compactFormSnapshot([
      {
        id: "b1",
        type: "table",
        data: {
          fontSize: "20px",
          table: [
            [
              {
                id: "c1",
                type: "paragraph",
                data: { text: "월" },
                backgroundColor: "#fff",
                fontWeight: 700,
              },
            ],
          ],
        },
      },
    ]);
    expect(compact[0].id).toBe("b1");
    expect(compact[0].table[0][0].id).toBe("c1");
    expect(compact[0].table[0][0].text).toBe("월");
    expect(compact[0].table[0][0].backgroundColor).toBe("#fff");
    expect(compact[0].table[0][0].fontWeight).toBe(700);
    expect(compact[0].data).toBeUndefined();
  });
});
