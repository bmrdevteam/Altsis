import { Server } from "socket.io";
import { client } from "../_database/redis/index.js";
import {
  getTaskCompleted,
  getTaskRequested,
} from "../controllers/enrollments.js";

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
    socket.on("listening", (data) => {
      const room = `${data.academyId}/${data.userId}`;
      socket.join(room);
    });

    socket.on("error", (err) => {
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
    // console.log("ioEnrollment connection is made; ", socket.id);

    socket.on("requestWaitingOrder", async (data) => {
      // console.log("requestWaitingOrder is received");
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
        console.error("Redis error on chat join:", err);
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
        console.error("Redis error on chat disconnect:", err);
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
