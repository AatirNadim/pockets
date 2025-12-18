import { ExtendedWebSocket } from "../util/types";

class UserService {
  private userSockets: Map<string, ExtendedWebSocket>;

  constructor() {
    this.userSockets = new Map<string, ExtendedWebSocket>();
  }

  getSocketForUser(userId: string) {
    return this.userSockets.get(userId);
  }

  createOrUpdateUserSocket(userId: string, socket: ExtendedWebSocket) {
    this.userSockets.set(userId, socket);
  }

  removeUserSocket(userId: string) {
    this.userSockets.delete(userId);
  }

  getAllUserIds() {
    return Array.from(this.userSockets.keys());
  }

  deleteUserSocket(userId: string) {
    this.userSockets.delete(userId);
  }

  deleteMultipleUserSockets(userIds: string[]) {
    userIds.forEach((userId) => this.userSockets.delete(userId));
  }
}

export { UserService };
