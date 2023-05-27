import { Server } from "socket.io";
import _ from "lodash";
import { client } from "../_database/redis/index.js";
import {
  getTaskCompleted,
  getTaskRequested,
} from "../controllers/enrollments.js";

let ioNotification = undefined;
let ioEnrollment = undefined;

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

      await client.hSet("io/notification/sid-user", socket.id, user);
      await client.hSet(
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
          await client.hDel("io/notification/sid-user", socket.id);
          const data = await client.v4.hGet(
            "io/notification/user-sidList",
            user
          );
          if (data) {
            const prevSidList = JSON.parse(data).sid;
            if (prevSidList) {
              if (prevSidList.length === 1) {
                await client.hDel("io/notification/user-sidList", user);
              } else {
                const idx = _.findIndex(
                  prevSidList,
                  (sid) => sid === socket.id
                );
                if (idx !== -1) {
                  await client.hSet(
                    "io/notification/user-sidList",
                    user,
                    JSON.stringify({
                      sid: prevSidList.splice(idx, 1),
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
};

const getIoNotification = () => ioNotification;
const getIoEnrollment = () => ioEnrollment;

export { initializeWebSocket, getIoNotification, getIoEnrollment };
