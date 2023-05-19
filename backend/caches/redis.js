import { createClient } from "redis";

let redisClient = null;

if (process.env.NODE_ENV?.trim() !== "local") {
  redisClient = createClient({
    url: process.env["REDIS_URL"],

    logErrors: true,
    legacyMode: true,
  });
} else {
  redisClient = createClient({
    host: "127.0.0.1",
    port: 6369,
    db: 0,

    logErrors: true,
    legacyMode: true,
  });
}

redisClient.connect();

redisClient.on("error", function (err) {
  console.log("Redis error: " + err);
});
redisClient.on("ready", () => {
  console.log("✅ redis is ready");
});
redisClient.on("connect", () => {
  console.log("✅ redis is connected");
});

export { redisClient as client };
