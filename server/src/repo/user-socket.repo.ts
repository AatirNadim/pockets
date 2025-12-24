import { WebSocket } from "ws";

class UserSocketRepo {
  private userSockets: Map<string, WebSocket>;

  constructor() {
    this.userSockets = new Map();
  }
  addUserSocket(userId: string, socket: WebSocket): void {
    this.userSockets.set(userId, socket);
  }

  getSocketForUser(userId: string): WebSocket | undefined {
    return this.userSockets.get(userId);
  }

  removeUserSocket(userId: string): void {
    this.userSockets.delete(userId);
  }

  removeMultipleUserSockets(userIds: string[]): void {
    userIds.forEach((userId) => {
      this.userSockets.delete(userId);
    });
  }

  getUserSocketMapForRoom(userIds: string[]): Map<string, WebSocket> {
    const socketMap = new Map<string, WebSocket>();
    userIds.forEach((userId) => {
      const socket = this.userSockets.get(userId);
      if (socket) {
        socketMap.set(userId, socket);
      }
    });
    return socketMap;
  }
}

export { UserSocketRepo };
