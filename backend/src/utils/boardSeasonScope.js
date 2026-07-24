/**
 * 보드 시즌 스코프 관련 순수 헬퍼
 */

/**
 * 시즌 스코프 보드인지 여부
 * @param {Object} board
 * @returns {boolean}
 */
export const isSeasonScopedBoard = (board) =>
  board?.scope === "season" && !!board.season;

/**
 * 시즌 Registration 가드 우회 가능 여부 (admin / manager / creator)
 * @param {Object} board
 * @param {Object} user
 * @returns {boolean}
 */
export const canBypassSeasonRegistration = (board, user) => {
  if (user.auth === "admin" || user.auth === "manager") return true;
  if (board.creator && board.creator.equals?.(user._id)) return true;
  if (
    board.creator &&
    board.creator.toString?.() === user._id?.toString?.()
  ) {
    return true;
  }
  return false;
};

/**
 * 목록에 포함될 보드인지 (학교 보드 ∪ 현재 시즌의 시즌 보드)
 * @param {Object} board
 * @param {string|null} currentSeasonId
 * @returns {boolean}
 */
export const isBoardVisibleForSeason = (board, currentSeasonId) => {
  if (board?.scope === "season") {
    if (!currentSeasonId || !board.season) return false;
    return String(board.season) === String(currentSeasonId);
  }
  return true;
};
