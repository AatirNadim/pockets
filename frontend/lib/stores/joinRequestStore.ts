import { create } from "zustand";

export type PendingJoinRequest = {
  roomId: string;
  guestId: string;
  guestName: string;
};

interface JoinRequestState {
  requests: PendingJoinRequest[];
  addRequest: (request: PendingJoinRequest) => boolean;
  removeRequest: (guestId: string) => void;
  clearRequests: () => void;
}

export const useJoinRequestStore = create<JoinRequestState>((set) => ({
  requests: [],
  addRequest: (request) => {
    let added = false;
    set((state) => {
      if (state.requests.some((pending) => pending.roomId === request.roomId && pending.guestId === request.guestId)) {
        return state;
      }
      added = true;
      return { requests: [...state.requests, request] };
    });
    return added;
  },
  removeRequest: (guestId) =>
    set((state) => ({
      requests: state.requests.filter((request) => request.guestId !== guestId),
    })),
  clearRequests: () => set({ requests: [] }),
}));
