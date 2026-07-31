import express from "express";
const router = express.Router();
import { isLoggedIn, isAdManager } from "../middleware/auth.js";
import { isBoardEnabled } from "../middleware/board.js";

import * as boards from "../controllers/boards.js";
import * as boardChats from "../controllers/boardChats.js";
import * as aiChats from "../controllers/aiChat.js";

// 게시판 CRUD (권한 체크는 컨트롤러에서 canManageBoard로 처리)
router.post("/", isLoggedIn, isBoardEnabled, boards.create);
router.post("/:_id/duplicate", isLoggedIn, isBoardEnabled, boards.duplicate);
router.get("/:_id?", isLoggedIn, isBoardEnabled, boards.find);
router.put("/:_id", isLoggedIn, isBoardEnabled, boards.update);
router.delete("/:_id", isLoggedIn, isBoardEnabled, boards.remove);

// 보드 커버 이미지
router.put("/:_id/cover-image", isLoggedIn, isBoardEnabled, boards.updateCoverImage);
router.delete("/:_id/cover-image", isLoggedIn, isBoardEnabled, boards.deleteCoverImage);

// 멤버 관리 (초대 기반)
router.get("/:_id/members/list", isLoggedIn, isBoardEnabled, boards.findMemberList);
router.post("/:_id/members/users", isLoggedIn, isBoardEnabled, boards.addMemberUser);
router.delete("/:_id/members/users", isLoggedIn, isBoardEnabled, boards.removeMemberUser);
router.delete("/:_id/leave", isLoggedIn, isBoardEnabled, boards.leaveBoard);

// 작성자 관리
router.post("/:_id/writers/users", isLoggedIn, isBoardEnabled, boards.addWriterUser);
router.delete("/:_id/writers/users", isLoggedIn, isBoardEnabled, boards.removeWriterUser);

// 보드 채팅 (전체 + 비공개 팀방)
router.get("/:_id/chat/room", isLoggedIn, isBoardEnabled, boardChats.getBoardChatRoom);
router.get("/:_id/chat/rooms", isLoggedIn, isBoardEnabled, boardChats.getBoardChatRooms);
router.post("/:_id/chat/rooms", isLoggedIn, isBoardEnabled, boardChats.createBoardChatRoom);
router.put(
  "/:_id/chat/rooms/:roomId",
  isLoggedIn,
  isBoardEnabled,
  boardChats.updateBoardChatRoomById
);
router.delete(
  "/:_id/chat/rooms/:roomId",
  isLoggedIn,
  isBoardEnabled,
  boardChats.deleteBoardChatRoomById
);
router.post(
  "/:_id/chat/rooms/:roomId/participants",
  isLoggedIn,
  isBoardEnabled,
  boardChats.addBoardChatRoomParticipants
);
router.delete(
  "/:_id/chat/rooms/:roomId/participants/:userId",
  isLoggedIn,
  isBoardEnabled,
  boardChats.removeBoardChatRoomParticipant
);
router.get(
  "/:_id/chat/rooms/:roomId/messages",
  isLoggedIn,
  isBoardEnabled,
  boardChats.getBoardChatRoomMessages
);
router.post(
  "/:_id/chat/rooms/:roomId/messages",
  isLoggedIn,
  isBoardEnabled,
  boardChats.sendBoardChatRoomMessage
);
router.delete(
  "/:_id/chat/rooms/:roomId/messages/:messageId",
  isLoggedIn,
  isBoardEnabled,
  boardChats.deleteBoardChatRoomMessage
);
router.put(
  "/:_id/chat/rooms/:roomId/read",
  isLoggedIn,
  isBoardEnabled,
  boardChats.markBoardChatRoomRead
);
router.post(
  "/:_id/chat/rooms/:roomId/upload",
  isLoggedIn,
  isBoardEnabled,
  boardChats.uploadBoardChatRoomFile
);
// 하위 호환 (기본: 전체 채팅)
router.get("/:_id/chat/messages", isLoggedIn, isBoardEnabled, boardChats.getBoardChatMessages);
router.post("/:_id/chat/messages", isLoggedIn, isBoardEnabled, boardChats.sendBoardChatMessage);
router.delete("/:_id/chat/messages/:messageId", isLoggedIn, isBoardEnabled, boardChats.deleteBoardChatMessage);
router.put("/:_id/chat/read", isLoggedIn, isBoardEnabled, boardChats.markBoardChatRead);
router.post("/:_id/chat/upload", isLoggedIn, isBoardEnabled, boardChats.uploadBoardChatFile);

// AI 채팅 (Alter)
router.get("/:_id/ai-chat/settings", isLoggedIn, isBoardEnabled, aiChats.getAIChatSettings);
router.get("/:_id/ai-chat/sessions", isLoggedIn, isBoardEnabled, aiChats.getAIChatSessions);
router.get("/:_id/ai-chat/sessions/:sessionId/messages", isLoggedIn, isBoardEnabled, aiChats.getAIChatMessages);
router.post("/:_id/ai-chat/messages", isLoggedIn, isBoardEnabled, aiChats.sendAIChatMessage);

export { router };
