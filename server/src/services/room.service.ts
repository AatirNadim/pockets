import { Room, User } from "@pockets/shared";
import { RequestQueueService } from "./requestQueue.service";
import { UserService } from "./user.service";
import { PersistenceClient } from "../repo/persistence/persistence-client";

class RoomService {
  constructor(private persistenceClient: PersistenceClient) {}

  async getHostIdForRoom(roomId: string) {
    const room = await this.getRoomDetails(roomId);
    return room?.hostId ?? null;
  }

  async getRoomDetails(roomId: string) {
    return await this.persistenceClient.getRoomById(roomId);
  }

  async createRoom(roomId: string, hostId: string) {
    await this.persistenceClient.createRoom(roomId, hostId);
  }

  async createAndPopulateRoom(roomId: string, hostId: string) {
    return await this.persistenceClient.createRoom(roomId, hostId);
  }

  async deleteRoom(roomId: string) {
    await this.persistenceClient.deleteRoom(roomId);
  }

  async updateRoom(room: Room) {
    await this.persistenceClient.updateRoom(room);
  }

  async getAllRoomIds() {
    return await this.persistenceClient.getAllRoomIds();
  }

  async addGuestToRoom(roomId: string, guestId: string) {
    const room = await this.getRoomDetails(roomId);
    if (!room) {
      console.error(`Room with id ${roomId} does not exist`);
      return;
    }
    room.guestIds.push(guestId);
    await this.updateRoom(room);
  }

  async removeUserFromRoom(roomId: string, guestId: string) {
    const room = await this.getRoomDetails(roomId);
    if (!room) {
      console.error(`Room with id ${roomId} does not exist`);
      return;
    }

    room.guestIds = room.guestIds.filter((id) => id !== guestId);
    await this.updateRoom(room);
  }

  async removeAllUsersFromRoom(roomId: string) {
    const room = await this.getRoomDetails(roomId);
    if (!room) {
      console.error(`Room with id ${roomId} does not exist`);
      return;
    }
    room.hostId = "";
    room.guestIds = [];
    room.pendingGuestIds = [];
    await this.updateRoom(room);
  }

  async getUserIdsForRoom(roomId: string) {
    return await this.persistenceClient.getUserIdsForRoom(roomId);
  }

  async getUserCountForRoom(roomId: string) {
    const userIds = await this.getUserIdsForRoom(roomId);
    return userIds.length;
  }

  async getAllUsersForRoom(roomId: string) {
    return await this.persistenceClient.getAllUsersForRoom(roomId);
  }

  async getAllGuestsForRoom(roomId: string) {
    return await this.persistenceClient.getAllGuestsForRoom(roomId);
  }

  async getAllPendingGuestIdsForRoom(roomId: string) {
    return await this.persistenceClient.getPendingGuestIdsForRoom(roomId);
  }

  async getPendingCountForRoom(roomId: string) {
    const pendingGuestIds = await this.getAllPendingGuestIdsForRoom(roomId);
    return pendingGuestIds.length;
  }

  async getAllPendingGuestsForRoom(roomId: string) {
    return await this.persistenceClient.getPendingGuestsForRoom(roomId);
  }

  async queuePendingGuest(roomId: string, guestId: string) {
    await this.persistenceClient.queuePending(roomId, guestId);
  }

  async removePendingGuestForRoom(roomId: string, guestId: string) {
    return await this.persistenceClient.removePending(roomId, guestId);
  }

  async removeAllPendingGuestsForRoom(roomId: string) {
    await this.persistenceClient.clearPending(roomId);
  }

  async peekPendingGuest(roomId: string, guestId: string) {
    return await this.persistenceClient.peekPending(roomId, guestId);
  }

  async isSpaceAvailableInRoom(roomId: string, maxCapacity: number) {
    const userCount = await this.getUserCountForRoom(roomId);
    const pendingCount = await this.getPendingCountForRoom(roomId);
    return userCount + pendingCount < maxCapacity;
  }
}

export { RoomService };
