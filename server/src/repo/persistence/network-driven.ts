import type { Room, User } from "@pockets/shared";
import { createClient, type RedisClientType } from "redis";
import type { PersistenceClient } from "./persistence-client";

type RedisPersistenceOptions = {
  keyPrefix?: string;
  roomTtlSeconds?: number; // optional, recommended
};

export class RedisPersistenceClient implements PersistenceClient {
  private client: RedisClientType;
  private keyPrefix: string;
  private roomTtlSeconds?: number;

  constructor(redisUrl: string, opts: RedisPersistenceOptions = {}) {
    this.keyPrefix = opts.keyPrefix ?? "pockets";
    this.roomTtlSeconds = opts.roomTtlSeconds;
    this.client = createClient({ url: redisUrl });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      this.client.on("error", (err) => console.error("Redis error:", err));
      await this.client.connect();
    }
  }

  private roomKey(roomId: string) {
    return `${this.keyPrefix}:room:${roomId}`;
  }

  private userKey(userId: string) {
    return `${this.keyPrefix}:user:${userId}`;
  }

  private roomsIndexKey() {
    return `${this.keyPrefix}:rooms`;
  }

  private userIndexKey() {
    return `${this.keyPrefix}:users`;
  }

  // private pendingKey(roomId: string) {
  //   return `${this.keyPrefix}:room:${roomId}`;
  // }

  private async touchRoomKeys(roomId: string) {
    if (!this.roomTtlSeconds) return;
    await this.client.expire(this.roomKey(roomId), this.roomTtlSeconds);
    // await this.client.expire(this.pendingKey(roomId), this.roomTtlSeconds);
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    const raw = await this.client.get(this.roomKey(roomId));
    if (!raw) {
      await this.client.sRem(this.roomsIndexKey(), roomId);
      return null;
    }
    const room = JSON.parse(raw) as Partial<Room>;
    // Redis Lua cjson encodes empty tables as `{}`. Normalize list fields at
    // the adapter boundary so callers always receive the Room contract shape.
    return {
      ...room,
      guestIds: Array.isArray(room.guestIds) ? room.guestIds : [],
      pendingGuestIds: Array.isArray(room.pendingGuestIds) ? room.pendingGuestIds : [],
    } as Room;
  }

  async touchRoom(roomId: string): Promise<void> {
    await this.touchRoomKeys(roomId);
  }

  async createRoom(roomId: string, hostId: string): Promise<Room> {
    const room = {
      id: roomId,
      hostId,
      guestIds: [] as string[],
      pendingGuestIds: [] as string[],
    } as Room;
    const created = await this.client.set(this.roomKey(roomId), JSON.stringify(room), { NX: true });
    if (created !== "OK") throw new Error(`Room ${roomId} already exists`);
    await this.client.sAdd(this.roomsIndexKey(), roomId);
    await this.touchRoomKeys(roomId);
    return room;
  }

  async requestGuestAdmission(roomId: string, guestId: string, maxCapacity: number): Promise<"queued" | "full" | "missing" | "duplicate"> {
    const script = `
      local raw = redis.call('GET', KEYS[1])
      if not raw then return 'missing' end
      local room = cjson.decode(raw)
      if room.hostId == ARGV[1] then return 'duplicate' end
      for _, id in ipairs(room.guestIds or {}) do if id == ARGV[1] then return 'duplicate' end end
      for _, id in ipairs(room.pendingGuestIds or {}) do if id == ARGV[1] then return 'duplicate' end end
      local count = 1 + #(room.guestIds or {}) + #(room.pendingGuestIds or {})
      if count >= tonumber(ARGV[2]) then return 'full' end
      room.pendingGuestIds = room.pendingGuestIds or {}
      table.insert(room.pendingGuestIds, ARGV[1])
      redis.call('SET', KEYS[1], cjson.encode(room))
      if tonumber(ARGV[3]) > 0 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3])) end
      return 'queued'
    `;
    return await this.client.eval(script, { keys: [this.roomKey(roomId)], arguments: [guestId, String(maxCapacity), String(this.roomTtlSeconds ?? 0)] }) as "queued" | "full" | "missing" | "duplicate";
  }

  async admitPendingGuest(roomId: string, guestId: string, maxCapacity: number): Promise<"accepted" | "full" | "not-pending"> {
    const script = `
      local raw = redis.call('GET', KEYS[1])
      if not raw then return 'not-pending' end
      local room = cjson.decode(raw)
      local pending = room.pendingGuestIds or {}
      local found = false
      for i, id in ipairs(pending) do
        if id == ARGV[1] then table.remove(pending, i); found = true; break end
      end
      if not found then return 'not-pending' end
      local guests = room.guestIds or {}
      if 1 + #guests >= tonumber(ARGV[2]) then return 'full' end
      table.insert(guests, ARGV[1])
      room.pendingGuestIds = pending
      room.guestIds = guests
      redis.call('SET', KEYS[1], cjson.encode(room))
      if tonumber(ARGV[3]) > 0 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3])) end
      return 'accepted'
    `;
    return await this.client.eval(script, { keys: [this.roomKey(roomId)], arguments: [guestId, String(maxCapacity), String(this.roomTtlSeconds ?? 0)] }) as "accepted" | "full" | "not-pending";
  }

  async updateRoom(room: Room): Promise<void> {
    await this.client.set(this.roomKey(room.id), JSON.stringify(room));
    await this.client.sAdd(this.roomsIndexKey(), room.id);
    await this.touchRoomKeys(room.id);
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.client.del(this.roomKey(roomId));
    await this.client.sRem(this.roomsIndexKey(), roomId);
  }

  async resetEphemeralState(): Promise<void> {
    const roomIds = await this.client.sMembers(this.roomsIndexKey());
    const userIds = await this.client.sMembers(this.userIndexKey());
    const keys = [...roomIds.map((id) => this.roomKey(id)), ...userIds.map((id) => this.userKey(id)), this.roomsIndexKey(), this.userIndexKey()];
    if (keys.length) await this.client.del(keys);
  }

  async getAllRoomIds(): Promise<string[]> {
    const ids = await this.client.sMembers(this.roomsIndexKey());
    const exists = await Promise.all(ids.map((id) => this.client.exists(this.roomKey(id))));
    const liveIds = ids.filter((_, index) => exists[index] === 1);
    const staleIds = ids.filter((_, index) => exists[index] !== 1);
    if (staleIds.length) await this.client.sRem(this.roomsIndexKey(), staleIds);
    return liveIds;
  }

  async getUserById(userId: string): Promise<User | null> {
    const raw = await this.client.get(this.userKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as User;
  }

  async createUser(user: User): Promise<User> {
    await this.client.set(this.userKey(user.id), JSON.stringify(user));
    await this.client.sAdd(this.userIndexKey(), user.id);
    return user;
  }

  async updateUser(user: User): Promise<void> {
    await this.client.set(this.userKey(user.id), JSON.stringify(user));
    await this.client.sAdd(this.userIndexKey(), user.id);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.client.del(this.userKey(userId));
    await this.client.sRem(this.userIndexKey(), userId);
  }

  async addGuestToRoom(roomId: string, guestId: string): Promise<void> {
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error(`Room with id ${roomId} does not exist`);
    }
    room.guestIds.push(guestId);
    await this.updateRoom(room);
  }

  async removeGuestFromRoom(roomId: string, guestId: string): Promise<void> {
    const script = `
      local raw = redis.call('GET', KEYS[1])
      if not raw then return 0 end
      local room = cjson.decode(raw)
      local guests = room.guestIds or {}
      for i = #guests, 1, -1 do if guests[i] == ARGV[1] then table.remove(guests, i) end end
      room.guestIds = guests
      redis.call('SET', KEYS[1], cjson.encode(room))
      if tonumber(ARGV[2]) > 0 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
      return 1
    `;
    await this.client.eval(script, { keys: [this.roomKey(roomId)], arguments: [guestId, String(this.roomTtlSeconds ?? 0)] });
  }

  async getUserIdsForRoom(roomId: string): Promise<string[]> {
    const room = await this.getRoomById(roomId);
    if (!room) return [];
    const userIds = [];
    if (room.hostId) {
      userIds.push(room.hostId);
    }
    if (room.guestIds) {
      userIds.push(...room.guestIds);
    }
    return userIds;
  }

  async getAllGuestsForRoom(roomId: string): Promise<User[]> {
    const room = await this.getRoomById(roomId);
    if (!room) return [];
    const users: User[] = [];
    for (const userId of room.guestIds) {
      const user = await this.getUserById(userId);
      if (user) {
        users.push(user);
      }
    }
    return users;
  }

  async getAllUsersForRoom(roomId: string): Promise<User[]> {
    const room = await this.getRoomById(roomId);
    if (!room) return [];
    const users: User[] = [];
    const host = await this.getUserById(room.hostId);
    if (!host) {
      throw new Error(`Host user with id ${room.hostId} does not exist`);
    }
    users.push(host);
    for (const userId of room.guestIds) {
      const user = await this.getUserById(userId);
      if (user) {
        users.push(user);
      }
    }
    return users;
  }

  async getPendingGuestIdsForRoom(roomId: string): Promise<string[]> {
    const room = await this.getRoomById(roomId);
    if (!room || !room.pendingGuestIds) return [];
    return room.pendingGuestIds;
  }

  async getPendingGuestsForRoom(roomId: string): Promise<User[]> {
    const room = await this.getRoomById(roomId);
    if (!room || !room.pendingGuestIds) return [];
    const users: User[] = [];
    for (const userId of room.pendingGuestIds) {
      const user = await this.getUserById(userId);
      if (user) {
        users.push(user);
      }
    }
    return users;
  }

  async queuePending(roomId: string, guestId: string): Promise<void> {
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error(`Room with id ${roomId} does not exist`);
    }
    if (!room.pendingGuestIds) {
      room.pendingGuestIds = [];
    }
    if (!room.pendingGuestIds.includes(guestId)) {
      room.pendingGuestIds.push(guestId);
      await this.updateRoom(room);
    }
  }

  async peekPending(roomId: string, guestId: string): Promise<User | null> {
    const room = await this.getRoomById(roomId);
    if (
      !room ||
      !room.pendingGuestIds ||
      !room.pendingGuestIds.includes(guestId)
    ) {
      return null;
    }
    return await this.getUserById(guestId);
  }

  async removePending(roomId: string, guestId: string): Promise<User | null> {
    const script = `
      local raw = redis.call('GET', KEYS[1])
      if not raw then return 0 end
      local room = cjson.decode(raw)
      local pending = room.pendingGuestIds or {}
      local removed = false
      for i = #pending, 1, -1 do if pending[i] == ARGV[1] then table.remove(pending, i); removed = true end end
      if removed then
        room.pendingGuestIds = pending
        redis.call('SET', KEYS[1], cjson.encode(room))
        if tonumber(ARGV[2]) > 0 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
      end
      return removed and 1 or 0
    `;
    const removed = await this.client.eval(script, { keys: [this.roomKey(roomId)], arguments: [guestId, String(this.roomTtlSeconds ?? 0)] });
    return Number(removed) === 1 ? this.getUserById(guestId) : null;
  }

  async clearPending(roomId: string): Promise<void> {
    const room = await this.getRoomById(roomId);
    if (!room || !room.pendingGuestIds) {
      return;
    }
    room.pendingGuestIds = [];
    await this.updateRoom(room);
  }

  async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}
