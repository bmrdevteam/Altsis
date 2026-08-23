import {
  normalizeWeekdayScheduleInput,
  isWeekdayScheduleEnabled,
  getOccurrenceWindow,
  getOpenOccurrences,
  isInOccurrenceWindow,
  hasSubmittedCurrentOccurrence,
  hasSubmittedOccurrence,
  shouldShowUnsubmittedTodo,
  getEffectiveTodoCloseAt,
  estimateWeekdayOccurrenceCount,
  resolveOccurrenceKey,
  zonedLocalToUtc,
  getZonedParts,
} from "../../src/services/weekdaySchedule.js";
import {
  hasSubmittedForList,
  isFormRequiredMode,
  canRespondForm,
  checkMultipleResponseLimit,
} from "../../src/services/altForms.js";

const baseSettings = () => ({
  requiredMode: true,
  allowMultipleResponses: true,
  requiredResponseCount: 5,
  openAt: "2026-03-01T00:00:00.000Z",
  closeAt: "2026-03-31T15:00:00.000Z",
  weekdaySchedule: {
    enabled: true,
    daysOfWeek: [1, 3, 5], // Mon Wed Fri
    startTime: "09:00",
    endTime: "18:00",
  },
});

const formWith = (overrides = {}) => ({
  settings: { ...baseSettings(), ...overrides },
  isDraft: false,
});

describe("weekdaySchedule helpers", () => {
  test("normalizeWeekdayScheduleInput rejects missing prerequisites", () => {
    expect(() =>
      normalizeWeekdayScheduleInput(
        {
          enabled: true,
          daysOfWeek: [1],
          startTime: "09:00",
          endTime: "18:00",
        },
        { requiredMode: false, allowMultipleResponses: true }
      )
    ).toThrow(/필수/);
  });

  test("normalizeWeekdayScheduleInput allows end before start when offset >= 1", () => {
    const normalized = normalizeWeekdayScheduleInput(
      {
        enabled: true,
        daysOfWeek: [1],
        startTime: "18:00",
        endTime: "09:00",
        endDayOffset: 2,
      },
      {
        requiredMode: true,
        allowMultipleResponses: true,
        openAt: "2026-01-01",
        closeAt: "2026-12-31",
      }
    );
    expect(normalized.endDayOffset).toBe(2);
    expect(normalized.enabled).toBe(true);
  });

  test("normalizeWeekdayScheduleInput rejects end before start", () => {
    expect(() =>
      normalizeWeekdayScheduleInput(
        {
          enabled: true,
          daysOfWeek: [1],
          startTime: "18:00",
          endTime: "09:00",
        },
        {
          requiredMode: true,
          allowMultipleResponses: true,
          openAt: "2026-01-01",
          closeAt: "2026-12-31",
        }
      )
    ).toThrow(/종료/);
  });

  test("zonedLocalToUtc + getZonedParts round-trip KST noon", () => {
    const utc = zonedLocalToUtc(2026, 3, 11, 12, 0);
    const parts = getZonedParts(utc);
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(3);
    expect(parts.day).toBe(11);
    expect(parts.hour).toBe(12);
  });

  test("isInOccurrenceWindow true on selected weekday inside hours", () => {
    // 2026-03-11 is Wednesday (3) — KST 10:00
    const now = zonedLocalToUtc(2026, 3, 11, 10, 0);
    const form = formWith();
    expect(isWeekdayScheduleEnabled(form)).toBe(true);
    expect(isInOccurrenceWindow(form, now)).toBe(true);
    const win = getOccurrenceWindow(form, now);
    expect(win.windowStart.getTime()).toBe(
      zonedLocalToUtc(2026, 3, 11, 9, 0).getTime()
    );
    expect(win.windowEnd.getTime()).toBe(
      zonedLocalToUtc(2026, 3, 11, 18, 0).getTime()
    );
  });

  test("isInOccurrenceWindow false on non-selected weekday", () => {
    // 2026-03-10 is Tuesday
    const now = zonedLocalToUtc(2026, 3, 10, 10, 0);
    expect(isInOccurrenceWindow(formWith(), now)).toBe(false);
    expect(getOccurrenceWindow(formWith(), now)).toBeNull();
  });

  test("isInOccurrenceWindow false outside hours", () => {
    const now = zonedLocalToUtc(2026, 3, 11, 8, 59);
    expect(isInOccurrenceWindow(formWith(), now)).toBe(false);
  });

  test("hasSubmittedCurrentOccurrence uses createdAt in window", () => {
    const now = zonedLocalToUtc(2026, 3, 11, 12, 0);
    const form = formWith();
    const rows = [{ createdAt: zonedLocalToUtc(2026, 3, 11, 10, 30) }];
    expect(hasSubmittedCurrentOccurrence(form, rows, now)).toBe(true);
    expect(
      hasSubmittedCurrentOccurrence(
        form,
        [{ createdAt: zonedLocalToUtc(2026, 3, 10, 10, 0) }],
        now
      )
    ).toBe(false);
  });

  test("hasSubmittedCurrentOccurrence ignores isDraft rows even with createdAt in window", () => {
    const now = zonedLocalToUtc(2026, 3, 11, 12, 0);
    const form = formWith();
    expect(
      hasSubmittedCurrentOccurrence(
        form,
        [
          {
            isDraft: true,
            createdAt: zonedLocalToUtc(2026, 3, 11, 10, 30),
          },
        ],
        now
      )
    ).toBe(false);
  });

  test("shouldShowUnsubmittedTodo only inside window when not yet submitted", () => {
    const form = formWith();
    const deps = { isFormRequiredMode, hasSubmittedForList };
    const inWin = zonedLocalToUtc(2026, 3, 11, 10, 0);
    expect(shouldShowUnsubmittedTodo(form, [], inWin, deps)).toBe(true);
    expect(
      shouldShowUnsubmittedTodo(
        form,
        [{ createdAt: zonedLocalToUtc(2026, 3, 11, 9, 30) }],
        inWin,
        deps
      )
    ).toBe(false);
    expect(
      shouldShowUnsubmittedTodo(form, [], zonedLocalToUtc(2026, 3, 10, 10, 0), deps)
    ).toBe(false);
  });

  test("getEffectiveTodoCloseAt returns occurrence end inside window", () => {
    const now = zonedLocalToUtc(2026, 3, 11, 10, 0);
    const close = getEffectiveTodoCloseAt(formWith(), now);
    expect(close.getTime()).toBe(zonedLocalToUtc(2026, 3, 11, 18, 0).getTime());
  });
});

describe("canRespondForm + checkMultipleResponseLimit with weekdaySchedule", () => {
  const board = {
    creator: { equals: () => false },
    altBoardRole: new Map([["u1", "respondent"]]),
  };
  const user = { _id: { toString: () => "u1" }, auth: "member" };

  test("rejects on non-submit weekday", () => {
    const now = zonedLocalToUtc(2026, 3, 10, 10, 0);
    const res = canRespondForm(formWith(), board, user, now);
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/제출 기간/);
  });

  test("rejects outside hours", () => {
    const now = zonedLocalToUtc(2026, 3, 11, 20, 0);
    const res = canRespondForm(formWith(), board, user, now);
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/제출 기간/);
  });

  test("allows inside window", () => {
    const now = zonedLocalToUtc(2026, 3, 11, 10, 0);
    expect(canRespondForm(formWith(), board, user, now).allowed).toBe(true);
  });

  test("checkMultipleResponseLimit blocks second submit same occurrence", () => {
    const now = zonedLocalToUtc(2026, 3, 11, 12, 0);
    const rows = [{ createdAt: zonedLocalToUtc(2026, 3, 11, 10, 0) }];
    const res = checkMultipleResponseLimit(formWith(), rows, now);
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/이번 회차/);
  });
});

describe("N-day homework weekdaySchedule", () => {
  const homeworkSettings = () => ({
    requiredMode: true,
    allowMultipleResponses: true,
    requiredResponseCount: 10,
    openAt: "2026-03-01T00:00:00.000Z",
    closeAt: "2026-03-31T15:00:00.000Z",
    weekdaySchedule: {
      enabled: true,
      daysOfWeek: [1],
      startTime: "09:00",
      endTime: "18:00",
      endDayOffset: 2,
    },
  });
  const homeworkForm = (overrides = {}) => ({
    settings: { ...homeworkSettings(), ...overrides },
    isDraft: false,
  });

  test("Monday +2 days is open on Tuesday and Wednesday, closed after Wed 18:00", () => {
    const form = homeworkForm();
    // 2026-03-09 Mon, 03-10 Tue, 03-11 Wed, 03-12 Thu
    expect(
      isInOccurrenceWindow(form, zonedLocalToUtc(2026, 3, 10, 10, 0))
    ).toBe(true);
    expect(
      isInOccurrenceWindow(form, zonedLocalToUtc(2026, 3, 11, 12, 0))
    ).toBe(true);
    expect(
      isInOccurrenceWindow(form, zonedLocalToUtc(2026, 3, 11, 18, 1))
    ).toBe(false);
    const wed = getOccurrenceWindow(form, zonedLocalToUtc(2026, 3, 11, 12, 0));
    expect(wed.key).toBe("2026-03-09");
    expect(wed.windowEnd.getTime()).toBe(
      zonedLocalToUtc(2026, 3, 11, 18, 0).getTime()
    );
  });

  test("estimate count is independent of endDayOffset", () => {
    const sameDay = formWith();
    const plusTwo = formWith({
      weekdaySchedule: {
        ...baseSettings().weekdaySchedule,
        endDayOffset: 2,
      },
    });
    expect(estimateWeekdayOccurrenceCount(sameDay)).toBe(
      estimateWeekdayOccurrenceCount(plusTwo)
    );
  });

  test("overlapping Mon/Wed +3 days are both open Wednesday afternoon", () => {
    const form = homeworkForm({
      weekdaySchedule: {
        enabled: true,
        daysOfWeek: [1, 3],
        startTime: "09:00",
        endTime: "18:00",
        endDayOffset: 3,
      },
    });
    const now = zonedLocalToUtc(2026, 3, 11, 14, 0);
    const open = getOpenOccurrences(form, now);
    expect(open.map((o) => o.key)).toEqual(["2026-03-09", "2026-03-11"]);
    expect(open[0].index).toBeLessThan(open[1].index);

    const monOcc = open[0];
    const wedOcc = open[1];
    const monRow = { _weekdayOccurrenceKey: "2026-03-09" };
    expect(hasSubmittedOccurrence(form, [monRow], monOcc)).toBe(true);
    expect(hasSubmittedOccurrence(form, [monRow], wedOcc)).toBe(false);
    expect(hasSubmittedCurrentOccurrence(form, [monRow], now)).toBe(false);

    const resolvedDefault = resolveOccurrenceKey(form, now, null, [monRow]);
    expect(resolvedDefault.occurrence.key).toBe("2026-03-11");

    const resolvedMonAgain = resolveOccurrenceKey(
      form,
      now,
      "2026-03-09",
      [monRow]
    );
    expect(resolvedMonAgain.error).toMatch(/이번 회차/);
  });
});
