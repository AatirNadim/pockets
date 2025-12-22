import { User } from "@pockets/shared";

class RequestQueueService {
  private pendingJoinRequests: Map<string, Map<string, User>>;
  constructor() {
    // Initialization code here
    this.pendingJoinRequests = new Map<string, Map<string, User>>();
  }

  getPendingJoinRequestForRoom(roomId: string) {
    return this.pendingJoinRequests.get(roomId);
  }

  ensurePendingMap(roomId: string) {
    if (!this.pendingJoinRequests.has(roomId)) {
      this.pendingJoinRequests.set(roomId, new Map<string, User>());
    }
    return this.pendingJoinRequests.get(roomId)!;
  }

  queuePendingGuest(roomId: string, guest: User) {
    const pending = this.ensurePendingMap(roomId);
    pending.set(guest.id, guest);
  }

  peekPendingGuest(roomId: string, guestId: string) {
    return this.pendingJoinRequests.get(roomId)?.get(guestId);
  }

  removePendingGuestForRoom(roomId: string, guestId: string) {
    const pending = this.pendingJoinRequests.get(roomId);
    if (!pending) {
      return null;
    }

    const guest = pending.get(guestId) ?? null;
    if (guest) {
      pending.delete(guestId);
      if (pending.size === 0) {
        this.pendingJoinRequests.delete(roomId);
      }
    }
    return guest;
  }

  removeAllPendingGuestsForRoom(roomId: string) {
    this.pendingJoinRequests.delete(roomId);
  }
}

export { RequestQueueService };
