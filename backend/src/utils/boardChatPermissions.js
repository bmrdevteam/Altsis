/**
 * 채팅방 참여자 여부
 * @param {Object} room
 * @param {string|ObjectId} userId
 * @returns {boolean}
 */
export const isRoomParticipant = (room, userId) => {
  if (!room?.participants || !userId) return false;
  const id = userId.toString();
  return room.participants.some((p) => p.user.toString() === id);
};

/**
 * Alt 보드에서 주제방 관리 가능 여부 (admin/writer/보드 생성자/시스템 admin)
 * @param {Object} board
 * @param {Object} user
 * @returns {boolean}
 */
export const canManageBoardChatRooms = (board, user) => {
  if (!user) return false;
  if (user.auth === "admin" || user.auth === "manager") return true;
  if (board.creator?.toString?.() === user._id.toString()) return true;
  if (String(board.creator) === String(user._id)) return true;

  const userOid = user._id.toString();
  if (board.altBoardRole) {
    const altRole =
      typeof board.altBoardRole.get === "function"
        ? board.altBoardRole.get(userOid)
        : board.altBoardRole[userOid];
    if (altRole === "admin" || altRole === "writer") return true;
  }
  return false;
};
