import { Server } from "socket.io";
import _ from "lodash";
import { client } from "../_database/redis/index.js";
import {
  getTaskCompleted,
  getTaskRequested,
} from "../controllers/enrollments.js";

let io = undefined;
let ioEnrollment = undefined;

const initializeWebSocket = (_server) => {
  /* initialize notification io */
  io = new Server(_server, {
    path: "/socket.io",
    cors: {
      origin: process.env["URL"].trim(),
      credentials: true,
    },
  });

  io.on("connect", (socket) => {
    const req = socket.request;
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    let academyId = "";
    let userId = "";

    socket.on("disconnect", async () => {
      if (academyId && userId) {
        const prev = await client.v4.hGet(academyId, userId);
        if (prev) {
          const prevSid = JSON.parse(prev).sid;
          if (prevSid) {
            if (prevSid.length === 1) await client.hDel(academyId, userId);
            else
              await client.hSet(
                academyId,
                userId,
                JSON.stringify({
                  sid: _.remove(prevSid, (sid) => sid === socket.id),
                })
              );
          }
        }
      }
    });

    socket.on("error", () => {
      console.log(`[${ip}] 에러가 발생했습니다. ${error}`);
    });

    socket.on("activate real-time notification", async (data) => {
      const prev = await client.v4.hGet(data.academyId, data.userId);
      if (prev) {
        const prevSid = JSON.parse(prev).sid;
        if (prevSid) {
          await client.hSet(
            data.academyId,
            data.userId,
            JSON.stringify({ sid: [socket.id, ...prevSid] })
          );
        }
      } else {
        academyId = data.academyId;
        userId = data.userId;
        await client.hSet(
          data.academyId,
          data.userId,
          JSON.stringify({ sid: [socket.id] })
        );
      }
    });

    socket.on("requestWaitingOrder", async (data) => {
      socket.emit("responseWaitingOrder", {
        waitingOrder: (data.taskIdx ?? 0) - (getTaskCompleted() ?? 0),
        waitingBehind: (getTaskRequested() ?? 0) - (data.taskIdx ?? 0),
      });
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

const getIo = () => io;
const getIoEnrollment = () => ioEnrollment;

export { initializeWebSocket, getIo, getIoEnrollment };
