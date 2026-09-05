import { TAltFormFieldType } from "types/altForm";

export const FIELD_TYPE_LABELS: Record<TAltFormFieldType, string> = {
  text: "단답형",
  textarea: "장문형",
  number: "숫자",
  date: "날짜",
  multiDate: "복수 날짜",
  time: "시간",
  file: "파일",
  select: "드롭다운",
  multiSelect: "체크박스",
  checkbox: "체크박스",
  radio: "객관식",
  userSelect: "사용자 선택",
  rating: "별점",
  scale: "척도",
  counter: "카운터",
  approval: "승인",
  circulation: "회람",
  link: "링크",
  content: "안내 문서",
  docResponse: "응답 문서",
  aiChat: "AI 챗봇",
};

export const nextFieldLabel = (
  type: TAltFormFieldType,
  existingLabels: string[]
): string => {
  const base = FIELD_TYPE_LABELS[type];
  const used = new Set(existingLabels.map((l) => String(l || "").trim()));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
};
