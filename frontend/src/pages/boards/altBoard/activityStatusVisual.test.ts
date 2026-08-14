import { TAltForm } from "types/altForm";
import { getActivityBadgeLabel } from "./activityStatusVisual";

const form = (extra: Partial<TAltForm> = {}): TAltForm =>
  ({
    _id: "f1",
    title: "활동",
    settings: { requiredMode: true, allowMultipleResponses: false },
    fields: [],
    isActive: true,
    ...extra,
  }) as TAltForm;

describe("getActivityBadgeLabel", () => {
  test("required unsubmitted stays 미제출 even with drafts", () => {
    expect(
      getActivityBadgeLabel(
        form({
          mySubmitted: false,
          myResponseCount: 0,
          myDraftCount: 1,
        })
      )
    ).toBe("미제출");
  });

  test("required+multiple shows n/N from submitted count only", () => {
    expect(
      getActivityBadgeLabel(
        form({
          settings: {
            requiredMode: true,
            allowMultipleResponses: true,
            requiredResponseCount: 3,
          } as TAltForm["settings"],
          mySubmitted: false,
          myResponseCount: 1,
          myDraftCount: 1,
        })
      )
    ).toBe("필수 1/3");
  });

  test("submitted badge when mySubmitted", () => {
    expect(
      getActivityBadgeLabel(
        form({
          mySubmitted: true,
          myResponseCount: 1,
          myDraftCount: 0,
        })
      )
    ).toBe("제출완료");
  });
});
