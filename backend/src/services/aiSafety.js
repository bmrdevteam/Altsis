/**
 * AI 입출력 안전 필터
 * @description 개인정보 패턴 마스킹·탐지 (교육 환경용 경량 필터)
 */

const PATTERNS = [
  {
    name: "rrn",
    // 주민등록번호
    regex: /\b\d{6}[-\s]?\d{7}\b/g,
    replacement: "[개인정보]",
  },
  {
    name: "phone",
    regex: /\b01[016789]-?\d{3,4}-?\d{4}\b/g,
    replacement: "[연락처]",
  },
  {
    name: "email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: "[이메일]",
  },
];

/**
 * 텍스트에서 개인정보성 패턴을 마스킹
 * @returns {{ text: string, masked: boolean, hits: string[] }}
 */
export const maskSensitiveText = (input) => {
  let text = String(input || "");
  const hits = [];
  for (const { name, regex, replacement } of PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    if (re.test(text)) {
      hits.push(name);
      text = text.replace(new RegExp(regex.source, regex.flags), replacement);
    }
  }
  return { text, masked: hits.length > 0, hits };
};

/**
 * 객체(문자열 값)에 대해 재귀적으로 마스킹
 */
export const maskSensitiveObject = (obj) => {
  if (obj == null) return obj;
  if (typeof obj === "string") {
    return maskSensitiveText(obj).text;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveObject(item));
  }
  if (typeof obj === "object") {
    const next = {};
    for (const [key, value] of Object.entries(obj)) {
      next[key] = maskSensitiveObject(value);
    }
    return next;
  }
  return obj;
};
