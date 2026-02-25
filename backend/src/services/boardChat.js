/**
 * Board Chat Service
 * @namespace Services.BoardChat
 *
 * @description 보드 채팅방 관리 서비스
 * - 보드당 하나의 채팅방을 자동 생성/관리
 * - 보드 멤버와 채팅방 참여자를 동기화
 */

import { ChatRoom } from "../models/index.js";
import { getBoardMembers } from "./boards.js";

/**
 * 보드의 채팅방을 조회하거나, 없으면 생성
 * @param {string} academyId
 * @param {Object} board - 보드 문서
 * @returns {Promise<Object>} ChatRoom 문서
 */
export const getOrCreateBoardChatRoom = async (academyId, board) => {
  let room = await ChatRoom(academyId).findOne({
    type: "board",
    board: board._id,
    isActive: true,
  });

  if (room) return room;

  // 보드 멤버로 참여자 목록 생성
  const members = await getBoardMembers(academyId, board);
  const participants = members.map((m) => ({
    user: m.user,
    userId: m.userId,
    userName: m.userName,
    joinedAt: new Date(),
  }));

  room = await ChatRoom(academyId).create({
    type: "board",
    board: board._id,
    name: board.name,
    creator: board.creator,
    creatorId: board.creatorId,
    creatorName: board.creatorName,
    participants,
  });

  return room;
};

/**
 * 보드 채팅방의 참여자를 현재 보드 멤버와 동기화
 * idempotent: 여러 번 호출해도 동일한 결과
 * @param {string} academyId
 * @param {Object} board - 보드 문서
 * @returns {Promise<Object|null>} 업데이트된 ChatRoom 문서 또는 null
 */
export const syncBoardChatParticipants = async (academyId, board) => {
  const room = await ChatRoom(academyId).findOne({
    type: "board",
    board: board._id,
    isActive: true,
  });

  if (!room) return null;

  const currentMembers = await getBoardMembers(academyId, board);
  const currentMemberIds = new Set(
    currentMembers.map((m) => m.user.toString())
  );
  const existingParticipantIds = new Set(
    room.participants.map((p) => p.user.toString())
  );

  let changed = false;

  // 새 멤버 추가
  for (const member of currentMembers) {
    if (!existingParticipantIds.has(member.user.toString())) {
      room.participants.push({
        user: member.user,
        userId: member.userId,
        userName: member.userName,
        joinedAt: new Date(),
      });
      changed = true;
    }
  }

  // 탈퇴한 멤버 제거
  const before = room.participants.length;
  room.participants = room.participants.filter((p) =>
    currentMemberIds.has(p.user.toString())
  );
  if (room.participants.length !== before) {
    changed = true;
  }

  if (changed) {
    await room.save();
  }

  return room;
};

/**
 * 보드 채팅방 비활성화 (보드 삭제 시 호출)
 * @param {string} academyId
 * @param {string} boardId - 보드 ObjectId
 * @returns {Promise<void>}
 */
export const deactivateBoardChatRoom = async (academyId, boardId) => {
  await ChatRoom(academyId).updateOne(
    { type: "board", board: boardId, isActive: true },
    { $set: { isActive: false } }
  );
};
