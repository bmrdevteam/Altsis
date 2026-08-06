/**
 * Alter chat용 페이지 데이터 스냅샷 유틸
 * @description 페이지에 이미 로드된 데이터만 요약·길이 제한해 서버로 보낸다.
 */

export type TAlterChatSnapshotItem = {
  title: string;
  fields?: Record<string, string>;
};

export type TAlterChatSnapshot = {
  summary: string;
  items?: TAlterChatSnapshotItem[];
  /** 항목·길이 상한으로 일부만 포함된 경우 */
  isPartial?: boolean;
  totalCount?: number;
};

export const ALTER_CHAT_SNAPSHOT_LIMITS = {
  MAX_ITEMS: 50,
  FIELD_VALUE_CHARS: 500,
  SUMMARY_CHARS: 400,
  DOCUMENT_CHARS: 8000,
  TOTAL_CHARS: 14000,
};

export const clipText = (value: unknown, maxChars: number): string => {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
};

const fieldBudget = (fields: Record<string, string>): number =>
  Object.entries(fields).reduce(
    (acc, [k, v]) => acc + k.length + String(v || "").length + 2,
    0
  );

/**
 * 항목·문자수 상한을 적용한다.
 */
export const finalizeChatSnapshot = (
  snap: TAlterChatSnapshot
): TAlterChatSnapshot => {
  const limits = ALTER_CHAT_SNAPSHOT_LIMITS;
  let isPartial = !!snap.isPartial;
  const totalCount =
    typeof snap.totalCount === "number"
      ? snap.totalCount
      : Array.isArray(snap.items)
        ? snap.items.length
        : 0;

  const summary = clipText(snap.summary || "", limits.SUMMARY_CHARS);
  const rawItems = Array.isArray(snap.items) ? snap.items : [];
  if (rawItems.length > limits.MAX_ITEMS) isPartial = true;

  const items: TAlterChatSnapshotItem[] = [];
  let used =
    summary.length + (isPartial ? 24 : 0) + String(totalCount).length;

  for (const item of rawItems.slice(0, limits.MAX_ITEMS)) {
    const title = clipText(item?.title || "", 120) || "(제목 없음)";
    const fields: Record<string, string> = {};
    for (const [key, val] of Object.entries(item?.fields || {})) {
      const clipped = clipText(val, limits.FIELD_VALUE_CHARS);
      if (!clipped) continue;
      fields[clipText(key, 40) || key] = clipped;
    }
    const nextCost = title.length + fieldBudget(fields) + 8;
    if (used + nextCost > limits.TOTAL_CHARS) {
      isPartial = true;
      break;
    }
    items.push({ title, fields });
    used += nextCost;
  }

  if (rawItems.length > items.length) isPartial = true;

  return {
    summary,
    items,
    isPartial: !!isPartial,
    totalCount,
  };
};

const formatTeachers = (teachers: unknown): string => {
  if (!Array.isArray(teachers)) return "";
  return teachers
    .map((t) => String(t?.userName || t?.userId || "").trim())
    .filter(Boolean)
    .join(", ");
};

const formatTime = (time: unknown): string => {
  if (!Array.isArray(time)) return "";
  return time
    .map((t) => String(t?.label || "").trim())
    .filter(Boolean)
    .join(", ");
};

const courseToSnapshotItem = (
  c: any,
  enrolled: Set<string> | null
): TAlterChatSnapshotItem => {
  const id = String(c?._id || "");
  const subject = Array.isArray(c?.subject) ? c.subject.join(" > ") : "";
  const limit = Number(c?.limit) || 0;
  const count = Number(c?.count) || 0;
  const enrollType = c?.enrollType ? String(c.enrollType) : "";
  const fields: Record<string, string> = {};
  if (subject) fields["교과"] = subject;
  const teachers = formatTeachers(c?.teachers);
  if (teachers) fields["담당"] = teachers;
  const time = formatTime(c?.time);
  if (time) fields["시간"] = time;
  if (c?.classroom) fields["강의실"] = String(c.classroom);
  if (c?.point != null && c?.point !== "") fields["학점"] = String(c.point);
  if (limit > 0) fields["정원"] = `${count}/${limit}`;
  else if (count > 0) fields["수강"] = String(count);
  if (enrolled?.has(id) || enrollType === "enrolled") {
    fields["수강상태"] = "수강중";
  } else if (enrollType && enrollType !== "enroll") {
    fields["신청상태"] = enrollType;
  }
  return {
    title: String(c?.classTitle || "(수업명 없음)"),
    fields,
  };
};

/** 수강 목록 → 시간표 칸(라벨→수업명) 요약 */
export const buildTimetableSlotFields = (
  courses: any[]
): Record<string, string> => {
  const slots: Record<string, string> = {};
  for (const c of courses || []) {
    const title = String(c?.classTitle || "(수업)").trim();
    const room = c?.classroom ? `(${c.classroom})` : "";
    for (const t of c?.time || []) {
      const label = String(t?.label || "").trim();
      if (!label) continue;
      const cell = `${title}${room}`;
      slots[label] = slots[label] ? `${slots[label]} / ${cell}` : cell;
    }
  }
  return slots;
};

/**
 * 수업(강의계획서) 목록 → chat 스냅샷
 */
export const buildCourseListChatSnapshot = (
  courses: any[],
  opts: {
    label: string;
    seasonLabel?: string;
    enrolledIds?: Set<string> | string[];
  }
): TAlterChatSnapshot => {
  const list = Array.isArray(courses) ? courses : [];
  const enrolled = opts.enrolledIds
    ? opts.enrolledIds instanceof Set
      ? opts.enrolledIds
      : new Set(opts.enrolledIds.map(String))
    : null;

  const items = list.map((c) => courseToSnapshotItem(c, enrolled));

  const seasonBit = opts.seasonLabel ? ` (${opts.seasonLabel})` : "";
  return finalizeChatSnapshot({
    summary: `${opts.label}${seasonBit} — 불러온 수업 ${list.length}건`,
    items,
    totalCount: list.length,
  });
};

export type TAlterSubjectUser = {
  userName?: string;
  userId?: string;
  role?: string;
  schoolName?: string;
  teacherName?: string;
  grade?: string;
};

const ROLE_KO: Record<string, string> = {
  student: "학생",
  teacher: "교사",
  parents: "학부모",
  admin: "관리자",
};

/**
 * 학생/사용자 조회 화면(시간표·수강 등) → chat 스냅샷
 */
export const buildUserSearchChatSnapshot = (opts: {
  tabLabel: string;
  seasonLabel?: string;
  user: TAlterSubjectUser;
  courses: any[];
  /** 시간표 탭이면 칸별 배치도 포함 */
  includeTimetableSlots?: boolean;
}): TAlterChatSnapshot => {
  const list = Array.isArray(opts.courses) ? opts.courses : [];
  const u = opts.user || {};
  const roleKo = ROLE_KO[String(u.role || "")] || String(u.role || "");
  const profileFields: Record<string, string> = {};
  if (u.userId) profileFields["ID"] = String(u.userId);
  if (roleKo) profileFields["역할"] = roleKo;
  if (u.schoolName) profileFields["학교"] = String(u.schoolName);
  if (u.grade) profileFields["학년"] = String(u.grade);
  if (u.teacherName) profileFields["담당교사"] = String(u.teacherName);

  const items: TAlterChatSnapshotItem[] = [
    {
      title: `조회 대상: ${u.userName || "(이름 없음)"}`,
      fields: profileFields,
    },
  ];

  if (opts.includeTimetableSlots) {
    const slots = buildTimetableSlotFields(list);
    if (Object.keys(slots).length > 0) {
      items.push({
        title: "시간표 배치",
        fields: slots,
      });
    }
  }

  for (const c of list) {
    items.push(courseToSnapshotItem(c, null));
  }

  const seasonBit = opts.seasonLabel ? ` (${opts.seasonLabel})` : "";
  const name = u.userName || "사용자";
  return finalizeChatSnapshot({
    summary: `학생/사용자 조회 — ${name} · ${opts.tabLabel}${seasonBit} — 수업 ${list.length}건`,
    items,
    totalCount: items.length,
  });
};

/**
 * 캘린더 이벤트 목록 → chat 스냅샷
 */
export const buildCalendarEventsChatSnapshot = (
  events: any[],
  opts: { label?: string; rangeLabel?: string } = {}
): TAlterChatSnapshot => {
  const list = Array.isArray(events) ? events : [];
  const items = list.map((e) => {
    const fields: Record<string, string> = {};
    if (e?.startDate || e?.start)
      fields["시작"] = String(e.startDate || e.start).slice(0, 32);
    if (e?.endDate || e?.end)
      fields["종료"] = String(e.endDate || e.end).slice(0, 32);
    if (e?.scope) fields["범위"] = String(e.scope);
    if (e?.sourceType) fields["출처"] = String(e.sourceType);
    if (e?.description)
      fields["설명"] = clipText(e.description, 200);
    return {
      title: String(e?.title || e?.name || "(일정 없음)"),
      fields,
    };
  });
  const range = opts.rangeLabel ? ` · ${opts.rangeLabel}` : "";
  return finalizeChatSnapshot({
    summary: `${opts.label || "캘린더"}${range} — 불러온 일정 ${list.length}건`,
    items,
    totalCount: list.length,
  });
};
