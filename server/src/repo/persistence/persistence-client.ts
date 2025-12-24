import type { Room, User } from "@pockets/shared";

export interface PersistenceClient {
  // rooms
  getRoomById(roomId: string): Promise<Room | null>;
  createRoom(roomId: string, hostId: string): Promise<Room>;
  updateRoom(room: Room): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;
  getAllRoomIds(): Promise<string[]>;

  getUserById(userId: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(user: User): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  getUserIdsForRoom(roomId: string): Promise<string[]>;
  getAllGuestsForRoom(roomId: string): Promise<User[]>;
  getAllUsersForRoom(roomId: string): Promise<User[]>;

  addGuestToRoom(roomId: string, guestId: string): Promise<void>;
  removeGuestFromRoom(roomId: string, guestId: string): Promise<void>;

  // pending join requests
  getPendingGuestIdsForRoom(roomId: string): Promise<string[]>;
  getPendingGuestsForRoom(roomId: string): Promise<User[]>;
  queuePending(roomId: string, guestId: string): Promise<void>;
  peekPending(roomId: string, guestId: string): Promise<User | null>;
  removePending(roomId: string, guestId: string): Promise<User | null>;
  clearPending(roomId: string): Promise<void>;

  // lifecycle
  close(): Promise<void>;
}
