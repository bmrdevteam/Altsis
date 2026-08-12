/**
 * 활동 카드·할 일 목록용 마감 남은 시간 표시
 */

/** 마감까지 남은 일/시간 문구 (지난 마감·없음은 null) */
export const getDeadlineRemainingLabel = (
  closeAt?: string | null
): string | null => {
  if (!closeAt) return null;
  const ms = new Date(closeAt).getTime() - Date.now();
  if (ms <= 0) return null;

  const minutes = Math.floor(ms / (60 * 1000));
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));

  if (days >= 1) return `마감 ${days}일 남음`;
  if (hours >= 1) return `마감 ${hours}시간 남음`;
  return `마감 ${Math.max(1, minutes)}분 남음`;
};

/** 24시간 미만이면 긴급 스타일 */
export const isDeadlineUrgent = (closeAt?: string | null): boolean => {
  if (!closeAt) return false;
  const ms = new Date(closeAt).getTime() - Date.now();
  return ms > 0 && ms < 24 * 60 * 60 * 1000;
};
