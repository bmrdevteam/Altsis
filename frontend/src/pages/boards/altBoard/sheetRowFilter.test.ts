import { DateRange } from "components/dateRangeFilter/DateRangeFilterDropdown";
import { TAltSheetRow } from "types/altSheet";
import {
  hasSheetFieldFilters,
  RESPONDENT_FILTER_KEY,
  rowMatchesFieldFilters,
  SUBMITTED_AT_FILTER_KEY,
} from "./sheetRowFilter";

const row = (
  extra: Partial<TAltSheetRow> & { data?: Record<string, unknown> } = {}
): TAltSheetRow =>
  ({
    _id: extra._id || "r1",
    sheet: "s",
    form: "f",
    board: "b",
    data: extra.data || {},
    _submittedAt: extra._submittedAt || "2026-08-21T03:00:00.000Z",
    _updatedAt: "",
    isActive: true,
    createdAt: "",
    updatedAt: "",
    _respondentName: extra._respondentName,
    _respondentId: extra._respondentId,
    ...extra,
  }) as TAltSheetRow;

const fields = [
  { _id: "name", type: "text" },
  { _id: "when", type: "date" },
  { _id: "days", type: "multiDate" },
];

const formatCell = (value: unknown) => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
};

const emptyDates: Record<string, DateRange> = {};

describe("hasSheetFieldFilters", () => {
  test("ignores blank text and empty ranges", () => {
    expect(hasSheetFieldFilters({ a: "  " }, { d: { from: "", to: "" } })).toBe(
      false
    );
  });

  test("detects text or date filters", () => {
    expect(hasSheetFieldFilters({ a: "김" }, {})).toBe(true);
    expect(
      hasSheetFieldFilters({}, { d: { from: "2026-01-01", to: "" } })
    ).toBe(true);
  });
});

describe("rowMatchesFieldFilters", () => {
  test("matches all when filters are empty", () => {
    expect(
      rowMatchesFieldFilters(row(), {}, emptyDates, fields, formatCell)
    ).toBe(true);
  });

  test("filters respondent by name or id", () => {
    const kim = row({ _respondentName: "김하나", _respondentId: "kim1" });
    expect(
      rowMatchesFieldFilters(
        kim,
        { [RESPONDENT_FILTER_KEY]: "하나" },
        emptyDates,
        fields,
        formatCell
      )
    ).toBe(true);
    expect(
      rowMatchesFieldFilters(
        kim,
        { [RESPONDENT_FILTER_KEY]: "kim" },
        emptyDates,
        fields,
        formatCell
      )
    ).toBe(true);
    expect(
      rowMatchesFieldFilters(
        kim,
        { [RESPONDENT_FILTER_KEY]: "박" },
        emptyDates,
        fields,
        formatCell
      )
    ).toBe(false);
  });

  test("ANDs field text with respondent", () => {
    const hit = row({
      _respondentName: "김하나",
      data: { name: "체육" },
    });
    const miss = row({
      _respondentName: "김하나",
      data: { name: "음악" },
    });
    const filters = { [RESPONDENT_FILTER_KEY]: "김", name: "체" };
    expect(
      rowMatchesFieldFilters(hit, filters, emptyDates, fields, formatCell)
    ).toBe(true);
    expect(
      rowMatchesFieldFilters(miss, filters, emptyDates, fields, formatCell)
    ).toBe(false);
  });

  test("empty cell fails an active text filter", () => {
    expect(
      rowMatchesFieldFilters(
        row({ data: {} }),
        { name: "체육" },
        emptyDates,
        fields,
        formatCell
      )
    ).toBe(false);
  });

  test("date range is inclusive on YYYY-MM-DD", () => {
    const r = row({ data: { when: "2026-08-21" } });
    expect(
      rowMatchesFieldFilters(
        r,
        {},
        { when: { from: "2026-08-21", to: "2026-08-21" } },
        fields,
        formatCell
      )
    ).toBe(true);
    expect(
      rowMatchesFieldFilters(
        r,
        {},
        { when: { from: "2026-08-22", to: "" } },
        fields,
        formatCell
      )
    ).toBe(false);
  });

  test("multiDate matches if any value is in range", () => {
    const r = row({ data: { days: ["2026-08-01", "2026-08-21"] } });
    expect(
      rowMatchesFieldFilters(
        r,
        {},
        { days: { from: "2026-08-20", to: "2026-08-22" } },
        fields,
        formatCell
      )
    ).toBe(true);
    expect(
      rowMatchesFieldFilters(
        r,
        {},
        { days: { from: "2026-07-01", to: "2026-07-31" } },
        fields,
        formatCell
      )
    ).toBe(false);
  });

  test("submittedAt uses local calendar date", () => {
    const iso = "2026-08-21T03:00:00.000Z";
    const d = new Date(iso);
    const localYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    const r = row({ _submittedAt: iso });
    expect(
      rowMatchesFieldFilters(
        r,
        {},
        { [SUBMITTED_AT_FILTER_KEY]: { from: localYmd, to: localYmd } },
        fields,
        formatCell
      )
    ).toBe(true);
    expect(
      rowMatchesFieldFilters(
        r,
        {},
        { [SUBMITTED_AT_FILTER_KEY]: { from: "1999-01-01", to: "1999-01-01" } },
        fields,
        formatCell
      )
    ).toBe(false);
  });
});
