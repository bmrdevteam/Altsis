import {
  isScheduleStartEnabled,
  shouldExpandRecipientsToSchool,
  filterRecipientsBySettings,
} from "../../src/services/calendarEventNotify.js";

describe("calendarEventNotify", () => {
  describe("isScheduleStartEnabled", () => {
    test("enabled true만 허용", () => {
      expect(isScheduleStartEnabled({ scheduleStart: { enabled: true } })).toBe(
        true
      );
    });

    test("필드 없거나 false면 false", () => {
      expect(isScheduleStartEnabled({})).toBe(false);
      expect(isScheduleStartEnabled(null)).toBe(false);
      expect(
        isScheduleStartEnabled({ scheduleStart: { enabled: false } })
      ).toBe(false);
      expect(isScheduleStartEnabled({ scheduleStart: {} })).toBe(false);
    });
  });

  describe("shouldExpandRecipientsToSchool", () => {
    test("notifySchool + school scope + school id일 때만 true", () => {
      expect(
        shouldExpandRecipientsToSchool({
          notifySchool: true,
          scope: "school",
          school: "sch1",
        })
      ).toBe(true);
    });

    test("notifySchool false면 확장 안 함", () => {
      expect(
        shouldExpandRecipientsToSchool({
          notifySchool: false,
          scope: "school",
          school: "sch1",
        })
      ).toBe(false);
    });

    test("personal scope면 확장 안 함", () => {
      expect(
        shouldExpandRecipientsToSchool({
          notifySchool: true,
          scope: "personal",
          school: "sch1",
        })
      ).toBe(false);
    });

    test("school id 없으면 확장 안 함", () => {
      expect(
        shouldExpandRecipientsToSchool({
          notifySchool: true,
          scope: "school",
        })
      ).toBe(false);
    });
  });

  describe("filterRecipientsBySettings", () => {
    const recipients = [
      { user: "u1", userId: "alice", userName: "Alice" },
      { user: "u2", userId: "bob", userName: "Bob" },
    ];

    test("설정 없으면 기본 수신", () => {
      expect(
        filterRecipientsBySettings(recipients, [], "scheduleStart")
      ).toEqual(recipients);
    });

    test("scheduleStart false면 생성자도 제외", () => {
      const filtered = filterRecipientsBySettings(
        recipients,
        [
          {
            user: "u1",
            userId: "alice",
            settings: { scheduleStart: false },
          },
        ],
        "scheduleStart"
      );
      expect(filtered.map((u) => u.userId)).toEqual(["bob"]);
    });

    test("user ObjectId로도 매칭", () => {
      const filtered = filterRecipientsBySettings(
        recipients,
        [
          {
            user: "u2",
            userId: "mismatched-id",
            settings: { reminder: false },
          },
        ],
        "reminder"
      );
      expect(filtered.map((u) => u.userId)).toEqual(["alice"]);
    });

    test("userId 매칭으로도 옵트아웃", () => {
      const filtered = filterRecipientsBySettings(
        recipients,
        [{ userId: "bob", settings: { scheduleStart: false } }],
        "scheduleStart"
      );
      expect(filtered.map((u) => u.userId)).toEqual(["alice"]);
    });
  });
});
