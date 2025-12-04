import { Room, User } from "../util/types";
import { UserService } from "./user.service";

class RoomService {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map<string, Room>();
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
}

export { RoomService };
