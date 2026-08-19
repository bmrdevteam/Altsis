export const MESSAGE = new Map<string, string>([
  ["UNKNOWN", "알 수 없는 에러가 발생했습니다."],
  ["ACADEMYID_INVALID", "아카데미 ID가 형식에 맞지 않습니다."],
  ["ACADEMYNAME_INVALID", "아카데미 이름이 형식에 맞지 않습니다."],
  ["ADMINID_INVALID", "관리자  ID가 형식에 맞지 않습니다."],
  ["ADMINNAME_INVALID", "관리자 이름이 형식에 맞지 않습니다."],
  ["EMAIL_INVALID", "이메일이 형식에 맞지 않습니다."],
  ["TEL_INVALID", "전화번호가 형식에 맞지 않습니다."],
  ["ACADEMYID_IN_USE", "사용 중인 아카데미 ID입니다."],
  ["ACADEMY_NOT_FOUND", "아카데미를 찾을 수 없습니다."],
  ["ACADEMY_INACTIVATED", "이 아카데미에 로그인 할 수 없습니다."],
  ["USER_NOT_FOUND", "사용자를 찾을 수 없습니다."],
  ["PASSWORD_INCORRECT", "비밀번호가 틀렸습니다."],
  ["EMAIL_CONNECTED_ALREADY", "이메일이 이미 연결되어있습니다."],
  ["EMAIL_IN_USE", "사용 중인 이메일입니다."],
  ["SCHOOL_CONNECTED_ALREADY", "이미 등록된 학교입니다."],
  ["SCHOOL_DISCONNECTED_ALREADY", "등록되지 않은 학교입니다."],
  ["USERID_IN_USE", "사용 중인 아이디입니다."],
  ["SNSID.GOOGLE_IN_USE", "사용 중인 구글 로그인 이메일입니다."],
  ["LIMIT_FILE_SIZE", "파일 사이즈가 커서 업로드할 수 없습니다."],
  ["INVALID_FILE_TYPE", "파일 형식이 맞지 않아 업로드할 수 없습니다."],
  ["EMOJI_INVALID", "사용할 수 없는 이모지입니다."],
  [
    "SITE_FILE_LIMIT",
    "공개 웹사이트 파일 개수 한도를 초과했습니다.",
  ],
  [
    "SITE_SIZE_LIMIT",
    "공개 웹사이트 총 용량 한도를 초과했습니다.",
  ],
  ["YEAR_TERM_IN_USE", `해당 학년도에 동일한 이름의 학기가 존재합니다.`],
  [
    "SEASON_ALREADY_ACTIVATED_FIRST",
    `한 번 활성화된 학기의 양식을 변경할 수 없습니다.`,
  ],
  [
    "SEASON_FORM_HAS_DATA",
    "입력된 데이터가 있어 해당 양식을 변경할 수 없습니다.",
  ],
  ["FORM_LABEL_DUPLICATED", "양식에 중복된 항목이 있습니다."],
  ["REGISTRATION_IN_USE", "이미 등록되었습니다."],
  ["CLASSROOM_IN_USE", "해당 시간에 강의실이 사용 중입니다."],
  [
    "SYLLABUS_CONFIRMED_ALREADY",
    "승인이 완료된 강의계획서는 수정할 수 없습니다.",
  ],
  [
    "SYLLABUS_ENROLLED_ALREADY",
    "수강생이 있는 강의계획서(또는 강의실, 시간 및 승인 상태)는 수정(삭제)할 수 없습니다.",
  ],
  ["SYLLABUS_COUNT_EXCEEDS_LIMIT", "수강생 수가 수강정원을 초과합니다."],
  ["SYLLABUS_NOT_FOUND", "강의계획서를 찾을 수 없습니다."],
  ["ENROLLMENT_IN_USE", "이미 신청한 수업입니다."],
  ["STUDENTS_FULL", "수강정원이 다 찼습니다."],
  ["CREDIT_LIMIT_EXCEEDED", "최대 신청 학점을 초과했습니다."],
  ["TIME_DUPLICATED", "시간표가 중복되었습니다."],
  ["SYLLABUS_NOT_CONFIRMED", "승인되지 않은 수업입니다."],
  ["PERMISSION_DENIED", "권한이 없습니다."],
  ["BOARD_CONNECTED_ALREADY", "이미 보드가 연결된 수업입니다."],
  ["SYLLABUS_CONNECTED_ALREADY", "이미 다른 수업에 연결된 보드입니다."],
  ["BOARD_NOT_FOUND", "보드를 찾을 수 없습니다."],
  ["BOARD_REQUIRED", "보드를 선택해주세요."],
  ["TITLE_IN_USE", "제목이 중복됩니다."],
  ["CHAT_NOT_ENABLED", "이 아카데미에서 채팅 기능이 비활성화되어 있습니다."],
  ["PLAN_SHIFT_REQUIRED", "SHIFT 플랜이 꺼져 있어 이 기능을 사용할 수 없습니다."],
  ["PLAN_CTRL_REQUIRED", "CTRL 플랜이 꺼져 있어 AI를 사용할 수 없습니다."],
  [
    "SEASON_SEAT_LIMIT",
    "활성 학기 등록 인원이 ALT 좌석 한도에 도달했습니다. 소유자에게 한도 상향을 요청하세요.",
  ],
  [
    "STORAGE_LIMIT",
    "아카데미 파일 보관량이 SHIFT 한도에 도달했습니다. 파일을 정리하거나 한도를 늘려 주세요.",
  ],
  [
    "ACADEMY_TOKEN_LIMIT",
    "아카데미 이번 달 AI 토큰 한도에 도달했습니다. 소유자에게 한도 상향을 요청하세요.",
  ],
  ["ROOM_NOT_FOUND", "채팅방을 찾을 수 없습니다."],
  ["AI_NOT_ENABLED", "AI 기능이 활성화되지 않았습니다."],
  ["AI_NOT_ENABLED_FOR_SEASON", "이 학기에서 AI 기능이 활성화되지 않았습니다."],
  ["AI_API_KEY_NOT_SET", "AI API 키가 설정되지 않았습니다."],
  ["AI_NOT_AVAILABLE", "AI 기능을 사용할 수 없습니다."],
  [
    "AI_EMPTY_RESPONSE",
    "AI가 빈 응답을 반환했습니다. 모델 설정을 확인하거나 다시 시도해주세요.",
  ],
  [
    "AI_INVALID_JSON",
    "AI 응답 형식이 올바르지 않습니다. 다시 생성해주세요.",
  ],
  ["AI_MODEL_NOT_FOUND", "AI 모델을 찾을 수 없습니다. 모델 설정을 확인해주세요."],
  [
    "AI_INVALID_API_KEY",
    "AI API 키가 유효하지 않습니다. 설정을 확인해주세요.",
  ],
  ["AI_GENERATION_FAILED", "AI 생성 중 오류가 발생했습니다."],
  ["AI_CONTENT_BLOCKED", "안전 정책에 의해 응답이 차단되었습니다."],
  ["AI_PERMISSION_DENIED", "AI 사용 권한이 없습니다."],
  [
    "AI_USAGE_LIMIT_EXCEEDED",
    "오늘 AI 사용량(Alt) 한도를 초과했습니다. 관리자에게 문의해 주세요.",
  ],
]);

const UNKNOWN_MESSAGE = MESSAGE.get("UNKNOWN") ?? "알 수 없는 에러가 발생했습니다.";

function errorCodeFrom(err: unknown): string | undefined {
  if (typeof err === "string" && err) return err;
  if (!err || typeof err !== "object") return undefined;
  const fromBody = (err as { response?: { data?: { message?: unknown } } })
    .response?.data?.message;
  if (typeof fromBody === "string" && fromBody) return fromBody;
  return undefined;
}

/** API 에러 코드(또는 axios 응답)를 사용자용 한글로 바꾼다. */
export function messageFromError(err: unknown): string {
  const code = errorCodeFrom(err);
  if (!code) return UNKNOWN_MESSAGE;
  return MESSAGE.get(code) ?? UNKNOWN_MESSAGE;
}
