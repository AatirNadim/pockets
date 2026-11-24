import type { PersistenceClient } from "./persistence-client";
import { InMemoryPersistenceClient } from "./in-memory";
import { RedisPersistenceClient } from "./network-driven";

export async function createPersistenceClient(): Promise<PersistenceClient> {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    console.log("REDIS_URL not set, using in-memory persistence");
    return new InMemoryPersistenceClient();
  }

  console.log("Using Redis persistence");

  const client = new RedisPersistenceClient(redisUrl, {
    keyPrefix: "pockets",
    roomTtlSeconds: Number(process.env.ROOM_TTL_SECONDS ?? 3600) || 3600,
  });

  await client.connect();
  // A process restart ends all live sockets; old Redis room membership cannot be resumed.
  await client.resetEphemeralState();
  console.log("Connected to Redis");
  return client;
}
