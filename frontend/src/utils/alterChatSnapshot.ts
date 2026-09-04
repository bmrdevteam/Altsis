/**
 * Alter chat용 페이지 데이터 스냅샷 유틸
 * @description 페이지에 이미 로드된 데이터만 요약·길이 제한해 서버로 보낸다.
 */

import { extractSyllabusInputFields } from "./syllabusAiFields";

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
  /** 데이터 확대 모드로 생성된 경우 (서버 재절단용) */
  dataExpand?: boolean;
};

export type TAlterChatSnapshotProfile = "default" | "expanded";

export type TAlterChatSnapshotLimits = {
  MAX_ITEMS: number;
  FIELD_VALUE_CHARS: number;
  SUMMARY_CHARS: number;
  DOCUMENT_CHARS: number;
  TOTAL_CHARS: number;
};

/**
 * 기본 / 데이터 확대 한도. 백엔드 PROMPT_LIMITS.CHAT_SNAPSHOT_* 와 동기화.
 */
export const ALTER_CHAT_SNAPSHOT_PROFILES: Record<
  TAlterChatSnapshotProfile,
  TAlterChatSnapshotLimits
> = {
  default: {
    MAX_ITEMS: 50,
    /**
     * 필드값 상한. 문서함·보드 문서 본문(DOCUMENT_CHARS)과 맞춰
     * finalize 단계에서 긴 생기부 등이 500자로 재잘리지 않게 한다.
     * 목록형 화면은 등록 훅에서 짧게 잘라 보낸다.
     */
    FIELD_VALUE_CHARS: 40000,
    SUMMARY_CHARS: 400,
    DOCUMENT_CHARS: 40000,
    TOTAL_CHARS: 48000,
  },
  expanded: {
    MAX_ITEMS: 150,
    FIELD_VALUE_CHARS: 40000,
    SUMMARY_CHARS: 400,
    DOCUMENT_CHARS: 40000,
    TOTAL_CHARS: 120000,
  },
};

/** @deprecated 호환용 — ALTER_CHAT_SNAPSHOT_PROFILES.default 와 동일 */
export const ALTER_CHAT_SNAPSHOT_LIMITS = ALTER_CHAT_SNAPSHOT_PROFILES.default;

export const snapshotProfileFromExpand = (
  dataExpand?: boolean
): TAlterChatSnapshotProfile => (dataExpand ? "expanded" : "default");

export type TAlterChatSnapshotOpts = {
  dataExpand?: boolean;
  profile?: TAlterChatSnapshotProfile;
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
  snap: TAlterChatSnapshot,
  opts?: TAlterChatSnapshotOpts
): TAlterChatSnapshot => {
  const profile =
    opts?.profile || snapshotProfileFromExpand(opts?.dataExpand);
  const limits = ALTER_CHAT_SNAPSHOT_PROFILES[profile];
  const dataExpand = profile === "expanded";
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
    dataExpand: dataExpand || undefined,
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
    dataExpand?: boolean;
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
  return finalizeChatSnapshot(
    {
      summary: `${opts.label}${seasonBit} — 불러온 수업 ${list.length}건`,
      items,
      totalCount: list.length,
    },
    { dataExpand: opts.dataExpand }
  );
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
  dataExpand?: boolean;
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
  return finalizeChatSnapshot(
    {
      summary: `학생/사용자 조회 — ${name} · ${opts.tabLabel}${seasonBit} — 수업 ${list.length}건`,
      items,
      totalCount: items.length,
    },
    { dataExpand: opts.dataExpand }
  );
};

const eventStartMs = (e: any): number => {
  const raw = e?.startDate || e?.start || e?.endDate || e?.end;
  if (!raw) return Number.POSITIVE_INFINITY;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
};

const eventEndMs = (e: any): number => {
  const raw = e?.endDate || e?.end || e?.startDate || e?.start;
  if (!raw) return Number.NEGATIVE_INFINITY;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
};

const isClassSourceType = (sourceType: unknown): boolean => {
  const t = String(sourceType || "");
  return t === "enrollment" || t === "syllabus";
};

const eventOverlapsRange = (
  e: any,
  visibleStart?: string,
  visibleEnd?: string
): boolean => {
  if (!visibleStart && !visibleEnd) return true;
  const startBound = visibleStart
    ? new Date(visibleStart).getTime()
    : Number.NEGATIVE_INFINITY;
  const endBound = visibleEnd
    ? new Date(visibleEnd).getTime()
    : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(startBound) && !Number.isFinite(endBound)) return true;
  const eStart = eventStartMs(e);
  const eEnd = eventEndMs(e);
  if (!Number.isFinite(eStart) && !Number.isFinite(eEnd)) return true;
  return eStart <= endBound && eEnd >= startBound;
};

/**
 * 캘린더 이벤트 목록 → chat 스냅샷
 * @description 가시 기간으로 거른 뒤 수업(enrollment/syllabus)을 앞에 두고 상한을 적용한다.
 */
export const buildCalendarEventsChatSnapshot = (
  events: any[],
  opts: {
    label?: string;
    rangeLabel?: string;
    visibleStart?: string;
    visibleEnd?: string;
    dataExpand?: boolean;
  } = {}
): TAlterChatSnapshot => {
  const list = Array.isArray(events) ? events : [];
  const visible = list.filter((e) =>
    eventOverlapsRange(e, opts.visibleStart, opts.visibleEnd)
  );
  visible.sort((a, b) => {
    const classDiff =
      Number(isClassSourceType(b?.sourceType)) -
      Number(isClassSourceType(a?.sourceType));
    if (classDiff !== 0) return classDiff;
    return eventStartMs(a) - eventStartMs(b);
  });

  const items = visible.map((e) => {
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
  return finalizeChatSnapshot(
    {
      summary: `${opts.label || "캘린더"}${range} — 가시 일정 ${visible.length}건`,
      items,
      totalCount: visible.length,
    },
    { dataExpand: opts.dataExpand }
  );
};

/**
 * 강의계획서 상세(읽기) → chat 스냅샷
 */
export const buildSyllabusViewChatSnapshot = (
  course: any,
  formSyllabus?: any,
  opts?: TAlterChatSnapshotOpts
): TAlterChatSnapshot => {
  const c = course || {};
  const classTitle = String(c.classTitle || "(수업명 없음)");
  const subject = Array.isArray(c.subject) ? c.subject.join(" > ") : "";
  const fields: Record<string, string> = {};
  if (subject) fields["교과"] = subject;
  const time = formatTime(c.time);
  if (time) fields["시간"] = time;
  if (c.classroom) fields["강의실"] = String(c.classroom);
  if (c.point != null && c.point !== "") fields["학점"] = String(c.point);
  const limit = Number(c.limit) || 0;
  const count = Number(c.count);
  if (limit > 0) {
    fields["정원"] = Number.isFinite(count) ? `${count}/${limit}` : String(limit);
  }
  if (c.userName) fields["개설자"] = String(c.userName);
  const teachers = formatTeachers(c.teachers);
  if (teachers) fields["담당"] = teachers;

  const info = c.info && typeof c.info === "object" ? c.info : {};
  const inputFields = extractSyllabusInputFields(formSyllabus);
  if (inputFields.length > 0) {
    for (const f of inputFields) {
      const key = f.id || f.name;
      const val = info[key] ?? (f.name ? info[f.name] : undefined);
      const clipped = clipText(val, 500);
      if (clipped) fields[f.name || key] = clipped;
    }
  } else {
    for (const [k, v] of Object.entries(info)) {
      const clipped = clipText(v, 500);
      if (clipped) fields[k] = clipped;
    }
  }

  return finalizeChatSnapshot(
    {
      summary: `강의계획서 — ${classTitle}`,
      items: [{ title: classTitle, fields }],
      totalCount: 1,
    },
    opts
  );
};

const VIEW_MODE_KO: Record<string, string> = {
  table: "표",
  timetable: "시간표",
  doc: "문서",
  summary: "요약",
  aiChat: "AI 대화",
};

/** 시트 셀 값을 스냅샷용 짧은 텍스트로 (approval/content 필드는 호출 전에 제외) */
const formatSheetCellValue = (value: unknown, fieldType?: string): string => {
  if (value == null || value === "") return "";
  if (fieldType === "userSelect" && typeof value === "object") {
    const v = value as { userName?: string; userId?: string };
    return v.userName ? `${v.userName}(${v.userId || ""})` : "";
  }
  if (fieldType === "circulation" && Array.isArray(value)) {
    return value
      .map((u: { userName?: string; userId?: string }) =>
        u?.userName ? `${u.userName}(${u.userId || ""})` : u?.userId || ""
      )
      .filter(Boolean)
      .join(", ");
  }
  if (fieldType === "file" && Array.isArray(value)) {
    return value
      .map((f: { originalName?: string; key?: string; title?: string; ogTitle?: string; url?: string }) =>
        f.originalName || f.key || f.title || f.ogTitle || f.url || ""
      )
      .filter(Boolean)
      .join(", ");
  }
  if (fieldType === "link" && typeof value === "object") {
    const v = value as { title?: string; ogTitle?: string; url?: string };
    return v.title || v.ogTitle || v.url || "";
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "boolean") return value ? "Y" : "N";
  return String(value);
};

export type TSheetSnapshotField = {
  _id: string;
  label?: string;
  type?: string;
};

export type TSheetSnapshotRow = {
  _id?: string;
  _respondentName?: string;
  _respondentId?: string;
  _submittedAt?: string;
  data?: Record<string, unknown>;
};

/**
 * 양식 응답 시트(표·시간표·문서) → chat 스냅샷
 * @description 이미 로드·필터된 행만 포함. 추가 fetch 없음.
 * 행은 MAX_ITEMS까지 먼저 자른 뒤 직렬화한다(대량 시트 렌더 비용 방지).
 */
export const buildSheetChatSnapshot = (opts: {
  formTitle?: string;
  viewMode?: string;
  fields: TSheetSnapshotField[];
  rows: TSheetSnapshotRow[];
  /** 필터 전 전체 행 수 (표시용) */
  totalRowCount?: number;
  dataExpand?: boolean;
}): TAlterChatSnapshot => {
  const fields = Array.isArray(opts.fields) ? opts.fields : [];
  const rows = Array.isArray(opts.rows) ? opts.rows : [];
  const viewKo = VIEW_MODE_KO[String(opts.viewMode || "")] || "보기";
  const total =
    typeof opts.totalRowCount === "number" ? opts.totalRowCount : rows.length;
  const profile = snapshotProfileFromExpand(opts.dataExpand);
  const maxItems = ALTER_CHAT_SNAPSHOT_PROFILES[profile].MAX_ITEMS;
  const cellCap = opts.dataExpand ? 500 : 200;
  const rowsForItems = rows.slice(0, maxItems);

  const items: TAlterChatSnapshotItem[] = rowsForItems.map((row, idx) => {
    const name =
      row._respondentName ||
      row._respondentId ||
      `응답 ${idx + 1}`;
    const itemFields: Record<string, string> = {};
    if (row._respondentId) itemFields["ID"] = String(row._respondentId);
    if (row._submittedAt) {
      itemFields["제출"] = String(row._submittedAt).slice(0, 19);
    }
    for (const f of fields) {
      if (f.type === "content" || f.type === "approval") continue;
      const raw = row.data?.[f._id];
      const text = clipText(formatSheetCellValue(raw, f.type), cellCap);
      if (text) itemFields[f.label || f._id] = text;
    }
    return { title: String(name), fields: itemFields };
  });

  const title = opts.formTitle || "양식";
  const countBit =
    total !== rows.length
      ? `필터 후 ${rows.length}/${total}건`
      : `${rows.length}건`;

  return finalizeChatSnapshot(
    {
      summary: `${title} · ${viewKo} · ${countBit}`,
      items,
      totalCount: rows.length,
      isPartial: rows.length > rowsForItems.length,
    },
    { dataExpand: opts.dataExpand }
  );
};

type TBoardChatSnapshotMessage = {
  senderName?: string;
  content?: string;
  messageType?: string;
  isDeleted?: boolean;
  createdAt?: string;
  attachment?: { fileName?: string };
};

/**
 * 보드 채팅 탭에 이미 로드된 메시지 → chat 스냅샷 (읽기 전용)
 */
export const buildBoardChatSnapshot = (opts: {
  messages: TBoardChatSnapshotMessage[];
  roomName?: string;
  isGeneral?: boolean;
  boardName?: string;
  dataExpand?: boolean;
}): TAlterChatSnapshot => {
  const messages = Array.isArray(opts.messages) ? opts.messages : [];
  const usable = messages.filter(
    (m) => m && !m.isDeleted && m.messageType !== "system"
  );
  const profile = snapshotProfileFromExpand(opts.dataExpand);
  const maxItems = ALTER_CHAT_SNAPSHOT_PROFILES[profile].MAX_ITEMS;
  const cellCap = opts.dataExpand ? 500 : 200;
  const recent = usable.slice(-maxItems);

  const items: TAlterChatSnapshotItem[] = recent.map((m) => {
    let body = "";
    if (m.messageType === "image") {
      body = "[이미지]";
    } else if (m.messageType === "file") {
      body = `[파일] ${m.attachment?.fileName || ""}`.trim();
    } else {
      body = clipText(String(m.content || ""), cellCap);
    }
    const time = m.createdAt
      ? String(m.createdAt).replace("T", " ").slice(0, 16)
      : "";
    const title = [m.senderName || "참여자", time].filter(Boolean).join(" · ");
    return {
      title,
      fields: { 내용: body },
    };
  });

  const roomLabel = opts.roomName || (opts.isGeneral ? "전체 채팅" : "채팅");
  const boardBit = opts.boardName ? `${opts.boardName} · ` : "";
  const scopeBit = opts.isGeneral === false ? "비공개 팀방 · " : "";

  return finalizeChatSnapshot(
    {
      summary: `보드 채팅 — ${boardBit}${roomLabel} · ${scopeBit}최근 ${recent.length}건`,
      items,
      totalCount: usable.length,
      isPartial: usable.length > recent.length,
    },
    { dataExpand: opts.dataExpand }
  );
};
