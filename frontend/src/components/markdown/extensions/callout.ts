/** GitHub Alerts 스타일 콜아웃 — 뷰어에서 마크다운 문법만 렌더 */

export const CALLOUT_TYPES = [
  "NOTE",
  "TIP",
  "IMPORTANT",
  "WARNING",
  "CAUTION",
] as const;

export type CalloutType = (typeof CALLOUT_TYPES)[number];

/** 접근성용 라벨 (화면에는 아이콘만 표시) */
export const CALLOUT_LABELS: Record<CalloutType, string> = {
  NOTE: "참고",
  TIP: "팁",
  IMPORTANT: "중요",
  WARNING: "경고",
  CAUTION: "주의",
};

/** 16x16 Material-style path (viewBox 0 0 24 24) */
export const CALLOUT_ICON_PATHS: Record<CalloutType, string> = {
  // info
  NOTE: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  // lightbulb
  TIP: "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z",
  // report / feedback (중요)
  IMPORTANT:
    "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z",
  // warning triangle
  WARNING:
    "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  // cancel / block (주의)
  CAUTION:
    "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z",
};

export const isCalloutType = (value: string): value is CalloutType =>
  (CALLOUT_TYPES as readonly string[]).includes(value.toUpperCase());

export const normalizeCalloutType = (value?: string | null): CalloutType => {
  const upper = (value || "NOTE").toUpperCase();
  return isCalloutType(upper) ? upper : "NOTE";
};

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const calloutIconHtml = (type: CalloutType): string => {
  const label = CALLOUT_LABELS[type];
  const path = CALLOUT_ICON_PATHS[type];
  return `<span class="md-callout-icon" aria-label="${label}" title="${label}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg></span>`;
};

/**
 * `> [!TYPE]` 블록(한 줄 깨진 형태 포함) → HTML 콜아웃
 */
export const preprocessCallouts = (md: string): string => {
  let source = md.replace(
    /(^|\n)&gt;(\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\])/gi,
    "$1>$2"
  );

  const re =
    /(^|\n)(>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][^\n]*(?:\n>\s?[^\n]*)*)(?=\n|$)/gi;

  return source.replace(re, (full, prefix: string, block: string) => {
    const stripped = block.split("\n").map((l) => l.replace(/^>\s?/, ""));
    const first = stripped[0] || "";
    const tm =
      /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:>\s*)?(.*)$/i.exec(
        first
      );
    if (!tm) return full;

    const type = normalizeCalloutType(tm[1]);
    const bodyParts: string[] = [];
    if (tm[2]?.trim()) bodyParts.push(tm[2].trim());
    for (let i = 1; i < stripped.length; i += 1) {
      bodyParts.push(stripped[i].replace(/^\s*>\s*/, ""));
    }
    const body = bodyParts.join("\n").trim();
    const bodyHtml = body
      ? body
          .split(/\n{2,}/)
          .map(
            (para) =>
              `<p>${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`
          )
          .join("")
      : "<p></p>";

    return `${prefix}<div class="md-callout md-callout-${type.toLowerCase()}" data-callout="${type}">${calloutIconHtml(type)}<div class="md-callout-body">${bodyHtml}</div></div>`;
  });
};
