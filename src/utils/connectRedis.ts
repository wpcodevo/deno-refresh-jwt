import { connectRedis } from "../deps.ts";

const redisClient = await connectRedis({
  hostname: "localhost",
  port: 6379,
});

console.log("🚀 Redis connected successfully");

export default redisClient;
