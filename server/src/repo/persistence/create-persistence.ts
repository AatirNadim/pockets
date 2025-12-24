import type { PersistenceClient } from "./persistence-client";
import { InMemoryPersistenceClient } from "./in-memory";
import { RedisPersistenceClient } from "./network-driven";

export async function createPersistenceClient(): Promise<PersistenceClient> {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    console.log("REDIS_URL not set, using in-memory persistence");
    return new InMemoryPersistenceClient();
  }

  console.log("Using Redis persistence at", redisUrl);

  const client = new RedisPersistenceClient(redisUrl, {
    keyPrefix: "pockets",
    roomTtlSeconds: Number(process.env.ROOM_TTL_SECONDS ?? 0) || undefined,
  });

  await client.connect();
  console.log("Connected to Redis");
  return client;
}
