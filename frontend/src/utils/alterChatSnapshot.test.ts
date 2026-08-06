import {
  ALTER_CHAT_SNAPSHOT_LIMITS,
  buildCourseListChatSnapshot,
  buildUserSearchChatSnapshot,
  finalizeChatSnapshot,
} from "./alterChatSnapshot";

describe("alterChatSnapshot", () => {
  test("finalizeChatSnapshot caps items and marks isPartial", () => {
    expect(ALTER_CHAT_SNAPSHOT_LIMITS.MAX_ITEMS).toBe(50);
    const items = Array.from({ length: 60 }, (_, i) => ({
      title: `수업 ${i}`,
      fields: { 학점: "1" },
    }));
    const snap = finalizeChatSnapshot({
      summary: "목록",
      items,
      totalCount: 60,
      isPartial: false,
    });
    expect(snap).toEqual(
      expect.objectContaining({
        totalCount: 60,
        isPartial: true,
      })
    );
    expect(snap.items?.length).toBe(50);
  });

  test("buildUserSearchChatSnapshot includes profile and timetable slots", () => {
    const snap = buildUserSearchChatSnapshot({
      tabLabel: "시간표",
      seasonLabel: "2026 2쿼터",
      user: {
        userName: "김병모",
        userId: "bmkim",
        role: "student",
        teacherName: "조은길",
      },
      courses: [
        {
          _id: "c1",
          classTitle: "리더십",
          time: [{ label: "월1" }, { label: "월2" }],
          classroom: "A101",
          subject: ["진로"],
        },
      ],
      includeTimetableSlots: true,
    });
    expect(snap.summary).toContain("김병모");
    expect(snap.summary).toContain("시간표");
    expect(snap.items?.[0].title).toContain("김병모");
    const slotItem = snap.items?.find((i) => i.title === "시간표 배치");
    expect(slotItem?.fields?.월1).toContain("리더십");
  });

  test("buildCourseListChatSnapshot includes enroll status", () => {
    const snap = buildCourseListChatSnapshot(
      [
        {
          _id: "a",
          classTitle: "시 읽기",
          subject: ["국어"],
          teachers: [{ userName: "김선생" }],
          time: [{ label: "월1" }],
          point: 2,
          limit: 20,
          count: 5,
        },
        {
          _id: "b",
          classTitle: "수강중수업",
          subject: ["수학"],
          enrollType: "enrolled",
        },
      ],
      {
        label: "수강 신청",
        seasonLabel: "2026 1쿼터",
        enrolledIds: ["b"],
      }
    );
    expect(snap.summary).toContain("수강 신청");
    expect(snap.totalCount).toBe(2);
    expect(snap.items?.[0].title).toBe("시 읽기");
    expect(snap.items?.[0].fields?.교과).toContain("국어");
    expect(snap.items?.[1].fields?.수강상태).toBe("수강중");
  });
});
