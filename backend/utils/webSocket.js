const SocketIO = require("socket.io");
const _ = require("lodash");
const client = require("../caches/redis");

const initializeWebSocket = (_server) => {
  io = SocketIO(_server, {
    path: "/socket.io",
    cors: {
      origin: process.env["URL"].trim(),
      credentials: true,
    },
  });

  io.on("connect", (socket) => {
    const req = socket.request;
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    console.log(`[${ip}] 새로운 유저가 접속했습니다.`);
    let academyId = "";
    let userId = "";

    socket.on("disconnect", async () => {
      console.log(`[${ip}] 접속을 해제했습니다.`);
      console.log(`debug: ${academyId}, ${userId}`);

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
  });
};

const getIo = () => io;

module.exports = {
  initializeWebSocket,
  getIo,
};
