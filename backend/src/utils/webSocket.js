import { Server } from "socket.io";
import { client } from "../_database/redis/index.js";
import {
  getTaskCompleted,
  getTaskRequested,
} from "../controllers/enrollments.js";
import { logger } from "../log/logger.js";

let ioNotification = undefined;
let ioEnrollment = undefined;
let ioChat = undefined;

const initializeWebSocket = (_server) => {
  /* initialize notification io */
  ioNotification = new Server(_server, {
    path: "/io/notification",
    cors: {
      origin: process.env["URL"].trim(),
      credentials: true,
    },
  });

  ioNotification.on("connect", (socket) => {
    logger.info(`[WS:Notification] client connected: ${socket.id}`);

    socket.on("listening", (data) => {
      const room = `${data.academyId}/${data.userId}`;
      socket.join(room);
      logger.info(`[WS:Notification] socket ${socket.id} joined room: ${room}`);
    });

    socket.on("disconnect", (reason) => {
      logger.info(`[WS:Notification] client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on("error", (err) => {
      logger.error(`[WS:Notification] socket error: ${socket.id}, ${err.message}`);
      if (err && err.message === "unauthorized event") {
        socket.disconnect();
      }
    });
  });

  /* initialize enrollment io */
  ioEnrollment = new Server(_server, {
    path: "/io/enrollment",
    cors: {
      origin: process.env["URL"].trim(),
      credentials: true,
    },
  });

  ioEnrollment.on("connect", (socket) => {
    socket.on("requestWaitingOrder", async (data) => {
      socket.emit("responseWaitingOrder", {
        waitingOrder: data.taskIdx - getTaskCompleted(),
        waitingBehind: getTaskRequested() - data.taskIdx,
      });
    });
  });

  /* initialize chat io */
  ioChat = new Server(_server, {
    path: "/io/chat",
    cors: {
      origin: process.env["URL"].trim(),
      credentials: true,
    },
  });

  ioChat.on("connect", (socket) => {
    socket.on("join", async (data) => {
      // data: { academyId, userId }
      const userRoom = `chat:${data.academyId}:${data.userId}`;
      socket.join(userRoom);

      // Store user mapping in Redis
      try {
        await client.v4.hSet("io/chat/sid-user", socket.id, userRoom);
      } catch (err) {
        logger.error("Redis error on chat join: " + err.message);
      }
    });

    socket.on("join_room", (data) => {
      // data: { roomId }
      socket.join(`room:${data.roomId}`);
    });

    socket.on("leave_room", (data) => {
      // data: { roomId }
      socket.leave(`room:${data.roomId}`);
    });

    socket.on("typing", (data) => {
      // data: { roomId, userId, userName, isTyping }
      socket.to(`room:${data.roomId}`).emit("user_typing", data);
    });

    socket.on("disconnect", async () => {
      try {
        await client.v4.hDel("io/chat/sid-user", socket.id);
      } catch (err) {
        logger.error("Redis error on chat disconnect: " + err.message);
      }
    });

    socket.on("error", (err) => {
      if (err && err.message === "unauthorized event") {
        socket.disconnect();
      }
    });
  });
};

const getIoNotification = () => ioNotification;
const getIoEnrollment = () => ioEnrollment;
const getIoChat = () => ioChat;

export { initializeWebSocket, getIoNotification, getIoEnrollment, getIoChat };
