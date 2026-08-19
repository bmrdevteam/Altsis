import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";
import { isChatEnabled } from "../middleware/chat.js";
import * as chats from "../controllers/chats.js";

//=================================
//             Chat Rooms
//=================================

router.post("/rooms", isLoggedIn, isChatEnabled, chats.createRoom);
router.get("/rooms", isLoggedIn, isChatEnabled, chats.findRooms);
router.get("/board-rooms", isLoggedIn, isChatEnabled, chats.findBoardRooms);
router.get("/rooms/:roomId", isLoggedIn, isChatEnabled, chats.findRoom);
router.put("/rooms/:roomId", isLoggedIn, isChatEnabled, chats.updateRoom);
router.delete("/rooms/:roomId", isLoggedIn, isChatEnabled, chats.deleteRoom);
router.delete("/rooms/:roomId/creator", isLoggedIn, isChatEnabled, chats.deleteRoomByCreator);

//=================================
//             Participants
//=================================

router.post("/rooms/:roomId/participants", isLoggedIn, isChatEnabled, chats.addParticipants);
router.delete("/rooms/:roomId/participants/:participantId", isLoggedIn, isChatEnabled, chats.removeParticipant);

//=================================
//             Pin / Archive
//=================================

router.put("/rooms/:roomId/pin", isLoggedIn, isChatEnabled, chats.pinRoom);
router.put("/rooms/:roomId/archive", isLoggedIn, isChatEnabled, chats.archiveRoom);

//=================================
//             Messages
//=================================

router.post("/rooms/:roomId/messages", isLoggedIn, isChatEnabled, chats.sendMessage);
router.get("/rooms/:roomId/messages", isLoggedIn, isChatEnabled, chats.findMessages);
router.delete("/rooms/:roomId/messages/:messageId", isLoggedIn, isChatEnabled, chats.deleteMessage);
router.put("/rooms/:roomId/messages/:messageId/reactions", isLoggedIn, isChatEnabled, chats.toggleReaction);
router.put("/rooms/:roomId/read", isLoggedIn, isChatEnabled, chats.markAsRead);

//=================================
//             File Upload
//=================================

router.post("/rooms/:roomId/upload", isLoggedIn, isChatEnabled, chats.uploadChatFile);

//=================================
//             File Storage
//=================================

router.get("/files", isLoggedIn, isChatEnabled, chats.findMyFiles);
router.delete("/files/:fileId", isLoggedIn, isChatEnabled, chats.deleteFile);
router.get("/files/:fileId/signed", isLoggedIn, isChatEnabled, chats.signChatFile);

//=================================
//             Users (for chat)
//=================================

router.get("/users", isLoggedIn, isChatEnabled, chats.searchUsers);

export { router };
