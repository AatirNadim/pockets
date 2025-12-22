import { User } from "@pockets/shared";
import { ExtendedWebSocket } from "../../util/types";
import { PersistenceClient } from "../repo/persistence/persistence-client";
import { UserSocketRepo } from "../repo/user-socket.repo";

class UserService {
  // use this client to make the calls to persistence layer
  constructor(private persistenceClient: PersistenceClient) {}

  async getUserDetails(userId: string) {
    return await this.persistenceClient.getUserById(userId);
  }

  async createUser(user: User) {
    return await this.persistenceClient.createUser(user);
  }

  async updateUser(user: User) {
    return await this.persistenceClient.updateUser(user);
  }

  async deleteUser(userId: string) {
    return await this.persistenceClient.deleteUser(userId);
  }

  async deleteMultipleUsers(userIds: string[]) {
    for (const userId of userIds) {
      await this.deleteUser(userId);
    }
  }
}

export { UserService };
