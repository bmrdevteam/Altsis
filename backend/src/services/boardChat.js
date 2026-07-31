/**
 * Board Chat Service
 * @namespace Services.BoardChat
 *
 * @description 보드 채팅방 관리 서비스
 * - 보드당 하나의 전체 채팅(isGeneral, 전원 sync)
 * - 초대제 비공개 팀방(isPrivate)
 */

import { ChatRoom } from "../models/index.js";
import { getBoardMembers } from "./boards.js";
import { isRoomParticipant } from "../utils/boardChatPermissions.js";

const buildParticipantsFromMembers = (members) =>
  members.map((m) => ({
    user: m.user,
    userId: m.userId,
    userName: m.userName,
    joinedAt: new Date(),
  }));

export { isRoomParticipant };

/**
 * 레거시 비-전체 방을 비공개 팀방으로 표기
 */
export const ensureTeamRoomPrivate = async (room) => {
  if (!room || room.isGeneral) return room;
  if (room.isPrivate) return room;
  room.isPrivate = true;
  await room.save();
  return room;
};

/**
 * 레거시 보드 방(isGeneral 미설정)을 전체 채팅으로 승격
 */
const promoteLegacyGeneralRoom = async (academyId, boardId) => {
  const legacy = await ChatRoom(academyId)
    .findOne({
      type: "board",
      board: boardId,
      isActive: true,
      isGeneral: { $exists: false },
    })
    .sort({ createdAt: 1 });

  if (!legacy) return null;

  const existingGeneral = await ChatRoom(academyId).findOne({
    type: "board",
    board: boardId,
    isActive: true,
    isGeneral: true,
  });
  if (existingGeneral) return existingGeneral;

  legacy.isGeneral = true;
  legacy.isPrivate = false;
  await legacy.save();
  return legacy;
};

/**
 * 보드의 전체 채팅방을 조회하거나, 없으면 생성
 */
export const getOrCreateBoardChatRoom = async (academyId, board) => {
  let room = await ChatRoom(academyId).findOne({
    type: "board",
    board: board._id,
    isActive: true,
    isGeneral: true,
  });

  if (room) return room;

  room = await promoteLegacyGeneralRoom(academyId, board._id);
  if (room) return room;

  const members = await getBoardMembers(academyId, board);
  const participants = buildParticipantsFromMembers(members);

  room = await ChatRoom(academyId).create({
    type: "board",
    board: board._id,
    name: board.name,
    isGeneral: true,
    isPrivate: false,
    creator: board.creator,
    creatorId: board.creatorId,
    creatorName: board.creatorName,
    participants,
  });

  return room;
};

/**
 * 보드 채팅방 목록: 전체 채팅 + 내가 참여 중인 팀방
 */
export const listBoardChatRooms = async (academyId, board, userId) => {
  await getOrCreateBoardChatRoom(academyId, board);
  await syncBoardChatParticipants(academyId, board);

  const rooms = await ChatRoom(academyId)
    .find({
      type: "board",
      board: board._id,
      isActive: true,
    })
    .lean();

  const visible = rooms.filter((room) => {
    if (room.isGeneral) return true;
    return isRoomParticipant(room, userId);
  });

  // 레거시 팀방 isPrivate 표기 (응답용; 저장은 개별 접근 시)
  for (const room of visible) {
    if (!room.isGeneral && !room.isPrivate) {
      room.isPrivate = true;
    }
  }

  visible.sort((a, b) => {
    if (a.isGeneral && !b.isGeneral) return -1;
    if (!a.isGeneral && b.isGeneral) return 1;
    return (a.name || "").localeCompare(b.name || "", "ko");
  });

  return visible;
};

/**
 * 보드에 속한 활성 채팅방 조회
 */
export const getBoardChatRoomById = async (academyId, board, roomId) => {
  return ChatRoom(academyId).findOne({
    _id: roomId,
    type: "board",
    board: board._id,
    isActive: true,
  });
};

/**
 * 비공개 팀방 생성 (생성자 + memberIds)
 */
export const createBoardTeamRoom = async (
  academyId,
  board,
  payload,
  creator
) => {
  const members = await getBoardMembers(academyId, board);
  const memberById = new Map(members.map((m) => [m.user.toString(), m]));

  const invitedIds = new Set(
    (payload.memberIds || [])
      .map((id) => String(id))
      .filter((id) => memberById.has(id))
  );
  invitedIds.add(creator._id.toString());

  const selectedMembers = [...invitedIds]
    .map((id) => memberById.get(id))
    .filter(Boolean);

  // 보드 멤버 목록에 없는 생성자(시스템 admin 등)도 반드시 포함
  if (
    !selectedMembers.some(
      (m) => m.user.toString() === creator._id.toString()
    )
  ) {
    selectedMembers.unshift({
      user: creator._id,
      userId: creator.userId,
      userName: creator.userName,
    });
  }

  return ChatRoom(academyId).create({
    type: "board",
    board: board._id,
    name: payload.name.trim(),
    description: payload.description?.trim() || undefined,
    isGeneral: false,
    isPrivate: true,
    creator: creator._id,
    creatorId: creator.userId,
    creatorName: creator.userName,
    participants: buildParticipantsFromMembers(selectedMembers),
  });
};

/** @deprecated use createBoardTeamRoom */
export const createBoardTopicRoom = createBoardTeamRoom;

/**
 * 팀방에 참여자 추가 (보드 멤버만)
 */
export const addBoardTeamParticipants = async (
  academyId,
  board,
  room,
  memberIds
) => {
  await ensureTeamRoomPrivate(room);
  if (room.isGeneral) {
    return { error: { status: 403, message: "PERMISSION_DENIED" } };
  }

  const members = await getBoardMembers(academyId, board);
  const memberById = new Map(members.map((m) => [m.user.toString(), m]));
  const existing = new Set(room.participants.map((p) => p.user.toString()));

  let changed = false;
  for (const rawId of memberIds || []) {
    const id = String(rawId);
    const member = memberById.get(id);
    if (!member || existing.has(id)) continue;
    room.participants.push({
      user: member.user,
      userId: member.userId,
      userName: member.userName,
      joinedAt: new Date(),
    });
    existing.add(id);
    changed = true;
  }

  if (changed) await room.save();
  return { room };
};

/**
 * 팀방 참여자 제거 / 나가기
 */
export const removeBoardTeamParticipant = async (room, userId) => {
  await ensureTeamRoomPrivate(room);
  if (room.isGeneral) {
    return { error: { status: 403, message: "PERMISSION_DENIED" } };
  }

  const before = room.participants.length;
  room.participants = room.participants.filter(
    (p) => p.user.toString() !== userId.toString()
  );
  if (room.participants.length === before) {
    return { error: { status: 404, message: "NOT_FOUND" } };
  }
  await room.save();
  return { room };
};

/**
 * 보드 채팅방 이름/설명 수정
 */
export const updateBoardChatRoom = async (room, payload) => {
  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (name) room.name = name;
  }
  if (payload.description !== undefined) {
    room.description = String(payload.description).trim();
  }
  await room.save();
  return room;
};

/**
 * 팀방 비활성화
 */
export const deactivateBoardTopicRoom = async (room) => {
  room.isActive = false;
  await room.save();
  return room;
};

/**
 * 전체 채팅: 전원 sync / 팀방: 탈퇴 멤버만 제거
 */
const syncGeneralRoom = async (room, currentMembers) => {
  const currentMemberIds = new Set(
    currentMembers.map((m) => m.user.toString())
  );
  const existingParticipantIds = new Set(
    room.participants.map((p) => p.user.toString())
  );

  let changed = false;

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

  const before = room.participants.length;
  room.participants = room.participants.filter((p) =>
    currentMemberIds.has(p.user.toString())
  );
  if (room.participants.length !== before) changed = true;

  if (changed) await room.save();
  return room;
};

/**
 * 보드 채팅방 참여자 동기화
 */
export const syncBoardChatParticipants = async (academyId, board) => {
  const rooms = await ChatRoom(academyId).find({
    type: "board",
    board: board._id,
    isActive: true,
  });

  if (rooms.length === 0) return [];

  const currentMembers = await getBoardMembers(academyId, board);
  const updated = [];

  for (const room of rooms) {
    if (room.isGeneral) {
      updated.push(await syncGeneralRoom(room, currentMembers));
    } else {
      // 레거시 공개 주제방 → 비공개 취급, 자동 추가 중단
      if (!room.isPrivate) {
        room.isPrivate = true;
      }
      const currentMemberIds = new Set(
        currentMembers.map((m) => m.user.toString())
      );
      const before = room.participants.length;
      room.participants = room.participants.filter((p) =>
        currentMemberIds.has(p.user.toString())
      );
      if (room.isModified("isPrivate") || room.participants.length !== before) {
        await room.save();
      }
      updated.push(room);
    }
  }

  return updated;
};

/**
 * 보드의 모든 활성 채팅방 비활성화 (보드 삭제 시)
 */
export const deactivateBoardChatRoom = async (academyId, boardId) => {
  await ChatRoom(academyId).updateMany(
    { type: "board", board: boardId, isActive: true },
    { $set: { isActive: false } }
  );
};

export { canManageBoardChatRooms } from "../utils/boardChatPermissions.js";
