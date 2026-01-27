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
router.get("/rooms/:roomId", isLoggedIn, isChatEnabled, chats.findRoom);
router.put("/rooms/:roomId", isLoggedIn, isChatEnabled, chats.updateRoom);
router.delete("/rooms/:roomId", isLoggedIn, isChatEnabled, chats.deleteRoom);

//=================================
//             Participants
//=================================

router.post("/rooms/:roomId/participants", isLoggedIn, isChatEnabled, chats.addParticipants);
router.delete("/rooms/:roomId/participants/:participantId", isLoggedIn, isChatEnabled, chats.removeParticipant);

//=================================
//             Messages
//=================================

router.post("/rooms/:roomId/messages", isLoggedIn, isChatEnabled, chats.sendMessage);
router.get("/rooms/:roomId/messages", isLoggedIn, isChatEnabled, chats.findMessages);
router.put("/rooms/:roomId/read", isLoggedIn, isChatEnabled, chats.markAsRead);

//=================================
//             Users (for chat)
//=================================

router.get("/users", isLoggedIn, isChatEnabled, chats.searchUsers);

export { router };
