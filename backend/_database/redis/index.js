import { createClient } from "redis";

let isConnected = false;
let client = undefined;

if (
  process.env.NODE_ENV.trim() !== "local" &&
  process.env.NODE_ENV.trim() !== "test"
) {
  client = createClient({
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

client.on("ready", async () => {
  // clean up "io/notification/*" data (only in production)

  if (process.env.NODE_ENV?.trim() === "production") {
    const [keys1, keys2] = await Promise.all([
      client.v4.hGetAll("io/notification/sid-user"),
      client.v4.hGetAll("io/notification/user-sidList"),
    ]);

    await Promise.all([
      Object.keys(keys1).forEach((key) =>
        client.hDel("io/notification/sid-user", key)
      ),
      Object.keys(keys2).forEach((key) =>
        client.hDel("io/notification/user-sidList", key)
      ),
    ]);
  }

  console.log("✅ Redis is connected");
  isConnected = true;
});

export { client, isConnected };
