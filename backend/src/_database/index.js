import { isConnected as isMongoDBConnected } from "./mongodb/index.js";
import {
  client as redisClient,
  isConnected as isRedisConnected,
} from "./redis/index.js";

export const isDBConnected = () => isMongoDBConnected && isRedisConnected;

export const ready = async () => {
  return await new Promise((resolve) => {
    const interval = setInterval(() => {
      if (isDBConnected()) {
        resolve("foo");
        clearInterval(interval);
      }
    }, 2000);
  });
};

export const closeDBConnections = async () => {
  await Promise.all([closeMongoDB(), closeRedis()]);
};

export { redisClient };
