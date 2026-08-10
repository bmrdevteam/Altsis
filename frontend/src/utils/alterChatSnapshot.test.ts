import {
  ALTER_CHAT_SNAPSHOT_LIMITS,
  ALTER_CHAT_SNAPSHOT_PROFILES,
  buildCalendarEventsChatSnapshot,
  buildCourseListChatSnapshot,
  buildSheetChatSnapshot,
  buildSyllabusViewChatSnapshot,
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

  test("데이터 확대 프로파일은 items 150까지 허용한다", () => {
    expect(ALTER_CHAT_SNAPSHOT_PROFILES.expanded.MAX_ITEMS).toBe(150);
    expect(ALTER_CHAT_SNAPSHOT_PROFILES.expanded.TOTAL_CHARS).toBe(120000);
    const items = Array.from({ length: 120 }, (_, i) => ({
      title: `응답 ${i}`,
      fields: { 칸: "값" },
    }));
    const defaultSnap = finalizeChatSnapshot({
      summary: "시트",
      items,
      totalCount: 120,
    });
    expect(defaultSnap.items?.length).toBe(50);
    expect(defaultSnap.isPartial).toBe(true);

    const expandedSnap = finalizeChatSnapshot(
      { summary: "시트", items, totalCount: 120 },
      { dataExpand: true }
    );
    expect(expandedSnap.items?.length).toBe(120);
    expect(expandedSnap.isPartial).toBe(false);
    expect(expandedSnap.dataExpand).toBe(true);
  });

  test("buildSheetChatSnapshot summarizes filtered rows", () => {
    const snap = buildSheetChatSnapshot({
      formTitle: "강의실 신청",
      viewMode: "timetable",
      fields: [
        { _id: "f1", label: "항목", type: "text" },
        { _id: "f2", label: "장소", type: "text" },
      ],
      rows: [
        {
          _respondentName: "김학생",
          _respondentId: "s1",
          data: { f1: "프로젝트", f2: "204" },
        },
        {
          _respondentName: "이학생",
          data: { f1: "회의", f2: "101" },
        },
      ],
      totalRowCount: 57,
    });
    expect(snap.summary).toContain("강의실 신청");
    expect(snap.summary).toContain("시간표");
    expect(snap.summary).toContain("2/57");
    expect(snap.totalCount).toBe(2);
    expect(snap.items?.[0].title).toBe("김학생");
    expect(snap.items?.[0].fields?.항목).toContain("프로젝트");
  });

  test("buildSheetChatSnapshot caps rows before serializing", () => {
    const rows = Array.from({ length: 80 }, (_, i) => ({
      _respondentName: `학생 ${i}`,
      data: { f1: `값 ${i}` },
    }));
    const snap = buildSheetChatSnapshot({
      formTitle: "대량",
      viewMode: "table",
      fields: [{ _id: "f1", label: "항목", type: "text" }],
      rows,
      totalRowCount: 80,
    });
    expect(snap.items?.length).toBe(50);
    expect(snap.totalCount).toBe(80);
    expect(snap.isPartial).toBe(true);
    expect(snap.items?.[0].title).toBe("학생 0");
    expect(snap.items?.some((it) => it.title === "학생 60")).toBe(false);
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

  test("긴 문서 본문은 FIELD_VALUE 상한으로 500자에서 잘리지 않는다", () => {
    const body = `교과학습발달상황 ${"가".repeat(12000)}`;
    expect(body.length).toBeGreaterThan(10000);
    const snap = finalizeChatSnapshot({
      summary: "문서함 — 생활기록부",
      items: [{ title: "생활기록부", fields: { 내용: body } }],
      totalCount: 1,
      isPartial: false,
    });
    expect(snap.isPartial).toBe(false);
    expect(snap.items?.[0].fields?.내용).toContain("교과학습발달상황");
    expect((snap.items?.[0].fields?.내용 || "").length).toBeGreaterThan(10000);
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

  test("buildCalendarEventsChatSnapshot keeps class events in visible week", () => {
    const lunch: any[] = [];
    // ~76 daily lunch instances ahead of class events (naive slice would drop classes)
    for (let i = 0; i < 76; i += 1) {
      const d = new Date(Date.UTC(2026, 5, 20 + i, 12, 0, 0)); // from June 20
      const iso = d.toISOString();
      lunch.push({
        title: "점심 시간",
        start: iso,
        end: new Date(d.getTime() + 60 * 60 * 1000).toISOString(),
        scope: "school",
        sourceType: "manual",
      });
    }
    const classes = [
      {
        title: "10학년 정보 B반",
        start: "2026-08-11T09:00:00.000Z",
        end: "2026-08-11T09:50:00.000Z",
        sourceType: "enrollment",
        scope: "personal",
      },
      {
        title: "상담 프로젝트",
        start: "2026-08-11T14:00:00.000Z",
        end: "2026-08-11T15:00:00.000Z",
        sourceType: "syllabus",
        scope: "personal",
      },
    ];
    const events = [...lunch, ...classes];
    const snap = buildCalendarEventsChatSnapshot(events, {
      label: "캘린더",
      visibleStart: "2026-08-10T00:00:00.000Z",
      visibleEnd: "2026-08-16T23:59:59.999Z",
    });
    expect(snap.summary).toContain("가시 일정");
    expect(snap.totalCount).toBeLessThan(events.length);
    const titles = (snap.items || []).map((i) => i.title);
    expect(titles).toContain("10학년 정보 B반");
    expect(titles).toContain("상담 프로젝트");
    const classIdx = titles.indexOf("10학년 정보 B반");
    const lunchIdx = titles.indexOf("점심 시간");
    expect(classIdx).toBeGreaterThanOrEqual(0);
    if (lunchIdx >= 0) expect(classIdx).toBeLessThan(lunchIdx);
  });

  test("buildSyllabusViewChatSnapshot includes meta and info fields", () => {
    const snap = buildSyllabusViewChatSnapshot(
      {
        classTitle: "기독교를 알아야 인생의 답이 보인다 2",
        subject: ["S56", "기독교 변증"],
        classroom: "202",
        time: [{ label: "목5" }, { label: "목6" }],
        point: 2,
        limit: 8,
        count: 8,
        userName: "조한빛",
        teachers: [{ userName: "조한빛" }],
        info: {
          bg: "개설 배경 본문",
          content: "1주차 학습내용",
        },
      },
      {
        data: [
          {
            type: "table",
            data: {
              table: [
                [
                  { type: "input", id: "bg", name: "개설배경" },
                  { type: "input", id: "content", name: "학습내용" },
                ],
              ],
            },
          },
        ],
      }
    );
    expect(snap.summary).toContain("강의계획서");
    expect(snap.totalCount).toBe(1);
    expect(snap.items?.[0].title).toContain("기독교");
    expect(snap.items?.[0].fields?.교과).toContain("기독교 변증");
    expect(snap.items?.[0].fields?.개설배경).toContain("개설 배경");
    expect(snap.items?.[0].fields?.학습내용).toContain("1주차");
  });
});
