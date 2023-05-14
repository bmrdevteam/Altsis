import { createClient } from "redis";

const redisClient = createClient({
  url: process.env["REDIS_URL"],
  logErrors: true,
  legacyMode: true,
});

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
