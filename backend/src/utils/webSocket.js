import { Server } from "socket.io";
import _ from "lodash";
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
    socket.on("listening", async (data) => {
      const user = `${data.academyId}/${data.userId}`;

      const prev = await client.v4.hGet("io/notification/user-sidList", user);
      const value = [socket.id];
      if (prev) {
        const prevSid = JSON.parse(prev).sid;
        if (prevSid) {
          value.push(...prevSid);
        }
      }

      await client.v4.hSet("io/notification/sid-user", socket.id, user);
      await client.v4.hSet(
        "io/notification/user-sidList",
        user,
        JSON.stringify({ sid: value })
      );
    });

    socket.on("disconnect", async () => {
      try {
        const user = await client.v4.hGet(
          "io/notification/sid-user",
          socket.id
        );
        if (user) {
          await client.v4.hDel("io/notification/sid-user", socket.id);
          const data = await client.v4.hGet(
            "io/notification/user-sidList",
            user
          );
          if (data) {
            const prevSidList = JSON.parse(data).sid;
            if (prevSidList) {
              if (prevSidList.length === 1) {
                await client.v4.hDel("io/notification/user-sidList", user);
              } else {
                const idx = _.findIndex(
                  prevSidList,
                  (sid) => sid === socket.id
                );
                if (idx !== -1) {
                  prevSidList.splice(idx, 1);
                  await client.v4.hSet(
                    "io/notification/user-sidList",
                    user,
                    JSON.stringify({
                      sid: prevSidList,
                    })
                  );
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
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
