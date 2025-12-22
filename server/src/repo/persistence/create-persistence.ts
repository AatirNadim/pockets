import type { PersistenceClient } from "./persistence-client";
import { InMemoryPersistenceClient } from "./in-memory";
import { RedisPersistenceClient } from "./network-driven";

export async function createPersistenceClient(): Promise<PersistenceClient> {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    return new InMemoryPersistenceClient();
  }

  const client = new RedisPersistenceClient(redisUrl, {
    keyPrefix: "pockets",
    roomTtlSeconds: Number(process.env.ROOM_TTL_SECONDS ?? 0) || undefined,
  });

  await client.connect();
  return client;
}
