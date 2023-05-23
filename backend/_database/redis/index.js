import { createClient } from "redis";

let isConnected = false;
let client = undefined;

if (process.env.NODE_ENV.trim() !== "local") {
  createClient({
    url: process.env["REDIS_URL"],
    logErrors: true,
    legacyMode: true,
  });
} else {
  client = createClient({
    host: "127.0.0.1",
    port: 6369,
    db: 0,
    logErrors: true,
    legacyMode: true,
  });
}

client.connect();

client.on("error", function (err) {
  console.error(err);
});

client.on("ready", () => {
  console.log("✅ Redis is connected");
  isConnected = true;
});

export { client, isConnected };
