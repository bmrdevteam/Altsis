/** 보드 커버 플레이스홀더 프리셋 (백엔드 boards.js 와 동일) */
export const BOARD_PRESET_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#78716c",
  "#0ea5e9",
] as const;

function hashStringToIndex(str: string, max: number): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash) % max;
}

/** 이름·ID 등으로 안정적인 플레이스홀더 색상을 고른다. */
export function getBoardPlaceholderColor(seed: string): string {
  const key = seed?.trim() || "board";
  return BOARD_PRESET_COLORS[
    hashStringToIndex(key, BOARD_PRESET_COLORS.length)
  ];
}

/** 저장된 coverColor가 없으면 seed로 폴백한다. */
export function resolveBoardCoverColor(
  coverColor: string | undefined | null,
  seed: string
): string {
  if (coverColor?.trim()) return coverColor.trim();
  return getBoardPlaceholderColor(seed);
}
