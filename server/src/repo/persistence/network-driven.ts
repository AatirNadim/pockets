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
    if (!raw) return null;
    return JSON.parse(raw) as Room;
  }

  async createRoom(roomId: string, hostId: string): Promise<Room> {
    const room = {
      id: roomId,
      hostId,
      guestIds: [] as string[],
      pendingGuestIds: [] as string[],
    } as Room;
    await this.client.set(this.roomKey(roomId), JSON.stringify(room));
    await this.client.sAdd(this.roomsIndexKey(), roomId);
    await this.touchRoomKeys(roomId);
    return room;
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

  async getAllRoomIds(): Promise<string[]> {
    return await this.client.sMembers(this.roomsIndexKey());
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
    const room = await this.getRoomById(roomId);
    if (!room) return;
    room.guestIds = room.guestIds.filter((id) => id !== guestId);
    await this.updateRoom(room);
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
    const room = await this.getRoomById(roomId);
    if (!room || !room.pendingGuestIds) {
      return null;
    }
    const index = room.pendingGuestIds.indexOf(guestId);
    if (index === -1) {
      return null;
    }
    room.pendingGuestIds.splice(index, 1);
    await this.updateRoom(room);
    return await this.getUserById(guestId);
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
