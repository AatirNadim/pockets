import { Room, User } from "../util/types";
import { RequestQueueService } from "./requestQueue.service";
import { UserService } from "./user.service";

class RoomService {
  private rooms: Map<string, Room>;
  private requestQueueService: RequestQueueService;

  constructor() {
    this.rooms = new Map<string, Room>();
    this.requestQueueService = new RequestQueueService();
  }

  getHostIdForRoom(roomId: string) {
    const room = this.getRoomDetails(roomId);
    return room?.hostId ?? null;
  }

  getRoomDetails(roomId: string) {
    return this.rooms.get(roomId);
  }

  createRoom(room: Room) {
    this.rooms.set(room.id, room);
  }

  createAndPopulateRoom(roomId: string, host: User) {
    const room: Room = {
      id: roomId,
      hostId: host.id,
      users: [host],
    };
    this.rooms.set(roomId, room);
    return room;
  }

  deleteRoom(roomId: string) {
    this.rooms.delete(roomId);
  }

  updateRoom(room: Room) {
    this.rooms.set(room.id, room);
  }

  getAllRoomIds() {
    return Array.from(this.rooms.keys());
  }

  addUserToRoom(roomId: string, user: User) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.push(user);
      this.rooms.set(roomId, room);
    }
  }

  removeUserFromRoom(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users = room.users.filter((user) => user.id !== userId);
      this.rooms.set(roomId, room);
    }
  }

  getPendingJoinRequestsForRoom(roomId: string) {
    return this.requestQueueService.getPendingJoinRequestForRoom(roomId);
  }

  queuePendingGuest(roomId: string, guest: User) {
    this.requestQueueService.queuePendingGuest(roomId, guest);
  }

  removePendingGuestForRoom(roomId: string, guestId: string) {
    return this.requestQueueService.removePendingGuestForRoom(roomId, guestId);
  }

  removeAllPendingGuestsForRoom(roomId: string) {
    this.requestQueueService.removeAllPendingGuestsForRoom(roomId);
  }
  peekPendingGuest(roomId: string, guestId: string) {
    return this.requestQueueService.peekPendingGuest(roomId, guestId);
  }
}

export { RoomService };
