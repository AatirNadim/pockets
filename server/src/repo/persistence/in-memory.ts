import type { Room, User } from "@pockets/shared";
import type { PersistenceClient } from "./persistence-client";

export class InMemoryPersistenceClient implements PersistenceClient {
  // room details mapped to roomids
  private rooms = new Map<string, Room>();
  // user details mapped to userids
  private users = new Map<string, User>();

  async getRoomById(roomId: string): Promise<Room | null> {
    return this.rooms.get(roomId) ?? null;
  }

  async touchRoom(_roomId: string): Promise<void> {
    // In-memory rooms have no expiry.
  }

  async createRoom(roomId: string, hostId: string): Promise<Room> {
    if (this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`);
    }
    this.rooms.set(roomId, {
      id: roomId,
      hostId,
      guestIds: [] as string[],
      pendingGuestIds: [] as string[],
    } as Room);
    return this.rooms.get(roomId)!;
  }

  async requestGuestAdmission(roomId: string, guestId: string, maxCapacity: number): Promise<"queued" | "full" | "missing" | "duplicate"> {
    const room = this.rooms.get(roomId);
    if (!room) return "missing";
    if (room.hostId === guestId || room.guestIds.includes(guestId) || room.pendingGuestIds.includes(guestId)) return "duplicate";
    if (room.guestIds.length + room.pendingGuestIds.length + 1 >= maxCapacity) return "full";
    room.pendingGuestIds.push(guestId);
    return "queued";
  }

  async admitPendingGuest(roomId: string, guestId: string, maxCapacity: number): Promise<"accepted" | "full" | "not-pending"> {
    const room = this.rooms.get(roomId);
    if (!room) return "not-pending";
    const pendingIndex = room.pendingGuestIds.indexOf(guestId);
    if (pendingIndex < 0) return "not-pending";
    if (room.guestIds.length + 1 >= maxCapacity) return "full";
    room.pendingGuestIds.splice(pendingIndex, 1);
    room.guestIds.push(guestId);
    return "accepted";
  }

  async updateRoom(room: Room): Promise<void> {
    this.rooms.set(room.id, room);
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
  }

  async resetEphemeralState(): Promise<void> {
    this.rooms.clear();
    this.users.clear();
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) ?? null;
  }

  async createUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async deleteUser(userId: string): Promise<void> {
    this.users.delete(userId);
  }

  async getAllRoomIds(): Promise<string[]> {
    return Array.from(this.rooms.keys());
  }

  async getUserIdsForRoom(roomId: string): Promise<string[]> {
    const room = this.rooms.get(roomId);
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
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const guestIds = room.guestIds || [];
    return guestIds
      .map((userId) => this.users.get(userId))
      .filter((user): user is User => user !== undefined);
  }

  async getAllUsersForRoom(roomId: string): Promise<User[]> {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const userIds = await this.getUserIdsForRoom(roomId);
    return userIds
      .map((userId) => this.users.get(userId))
      .filter((user): user is User => user !== undefined);
  }

  async addGuestToRoom(roomId: string, guestId: string): Promise<void> {
    if (!this.users.get(guestId)) {
      console.warn(`User with id ${guestId} does not exist`);
      return;
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      console.warn(`Room with id ${roomId} does not exist`);
      return;
    }
    room.guestIds.push(guestId);
    this.rooms.set(roomId, room);
  }

  async removeGuestFromRoom(roomId: string, guestId: string): Promise<void> {
    if (!this.users.get(guestId)) {
      console.warn(`User with id ${guestId} does not exist`);
      return;
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      console.warn(`Room with id ${roomId} does not exist`);
      return;
    }
    room.guestIds = room.guestIds.filter((id) => id !== guestId);
    this.rooms.set(roomId, room);
  }

  async getPendingGuestIdsForRoom(roomId: string): Promise<string[]> {
    return this.rooms.get(roomId)?.pendingGuestIds ?? [];
  }

  async getPendingGuestsForRoom(roomId: string): Promise<User[]> {
    const room = this.rooms.get(roomId);
    if (!room || !room.pendingGuestIds) return [];
    return room.pendingGuestIds
      .map((userId) => this.users.get(userId))
      .filter((user): user is User => user !== undefined);
  }

  async queuePending(roomId: string, guestId: string): Promise<void> {
    if (!this.users.get(guestId)) {
      console.warn(`User with id ${guestId} does not exist`);
      return;
    }
    const pending = this.rooms.get(roomId)?.pendingGuestIds ?? [];
    if (!pending.includes(guestId)) {
      pending.push(guestId);
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      console.warn(`Room with id ${roomId} does not exist`);
      return;
    }
    room.pendingGuestIds = pending;
    this.rooms.set(roomId, room);
  }

  async peekPending(roomId: string, guestId: string): Promise<User | null> {
    const pending = this.rooms.get(roomId)?.pendingGuestIds ?? [];
    if (!pending.includes(guestId)) {
      return null;
    }
    return this.users.get(guestId) ?? null;
  }

  async removePending(roomId: string, guestId: string): Promise<User | null> {
    const room = this.rooms.get(roomId);
    if (!room || !room.pendingGuestIds) {
      return null;
    }
    const pending = room.pendingGuestIds;
    if (!pending.includes(guestId)) {
      return null;
    }
    room.pendingGuestIds = pending.filter((id) => id !== guestId);
    this.rooms.set(roomId, room);
    return this.users.get(guestId) ?? null;
  }

  async clearPending(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    room.pendingGuestIds = [];
    this.rooms.set(roomId, room);
  }

  async close(): Promise<void> {
    // no-op
  }
}
