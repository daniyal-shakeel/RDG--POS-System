import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({ url: redisUrl });
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

let isConnected = false;
let connecting: Promise<void> | null = null;

const ensureConnected = async (): Promise<void> => {
  if (isConnected) {
    return;
  }
  if (!connecting) {
    connecting = redisClient
      .connect()
      .then(() => {
        isConnected = true;
      })
      .catch((err) => {
        connecting = null;
        throw err;
      });
  }
  await connecting;
};

export const getRedisClient = async () => {
  try {
    await ensureConnected();
    return redisClient;
  } catch (error) {
    console.error("Redis connection failed:", error);
    return null;
  }
};

