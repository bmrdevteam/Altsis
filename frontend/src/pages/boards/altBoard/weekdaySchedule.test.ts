import { TAltForm } from "types/altForm";
import { shouldShowUnsubmittedTodoForm } from "./weekdaySchedule";

const weekdayForm = (extra: Partial<TAltForm> = {}): TAltForm =>
  ({
    _id: "f1",
    title: "요일마다 활동",
    isActive: true,
    fields: [],
    settings: {
      requiredMode: true,
      allowMultipleResponses: true,
      requiredResponseCount: 7,
      openAt: "2026-07-01T00:00:00.000Z",
      closeAt: "2026-10-01T00:00:00.000Z",
      weekdaySchedule: {
        enabled: true,
        daysOfWeek: [1],
        startTime: "09:00",
        endTime: "18:00",
        endDayOffset: 0,
      },
    },
    mySubmitted: false,
    myResponseCount: 0,
    ...extra,
  }) as TAltForm;

const now = new Date("2026-08-24T03:00:00.000Z");

describe("shouldShowUnsubmittedTodoForm (활동 탭 뱃지와 동일)", () => {
  test("회차 밖이면 미제출 뱃지에서 빠진다", () => {
    expect(
      shouldShowUnsubmittedTodoForm(
        weekdayForm({ inOccurrenceWindow: false }),
        now
      )
    ).toBe(false);
  });

  test("회차 안·미제출이면 뱃지에 남는다", () => {
    expect(
      shouldShowUnsubmittedTodoForm(
        weekdayForm({
          inOccurrenceWindow: true,
          submittedCurrentOccurrence: false,
        }),
        now
      )
    ).toBe(true);
  });

  test("이번 회차 제출 완료면 뱃지에서 빠진다", () => {
    expect(
      shouldShowUnsubmittedTodoForm(
        weekdayForm({
          inOccurrenceWindow: true,
          submittedCurrentOccurrence: true,
          myResponseCount: 1,
        }),
        now
      )
    ).toBe(false);
  });

  test("목표 횟수를 채우면 뱃지에서 빠진다", () => {
    expect(
      shouldShowUnsubmittedTodoForm(
        weekdayForm({
          inOccurrenceWindow: true,
          myResponseCount: 7,
        }),
        now
      )
    ).toBe(false);
  });
});
