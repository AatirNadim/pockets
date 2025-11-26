import { create } from "zustand";

export type PendingJoinRequest = {
  roomId: string;
  guestId: string;
  guestName: string;
};

interface JoinRequestState {
  requests: PendingJoinRequest[];
  addRequest: (request: PendingJoinRequest) => void;
  removeRequest: (guestId: string) => void;
  clearRequests: () => void;
}

export const useJoinRequestStore = create<JoinRequestState>((set) => ({
  requests: [],
  addRequest: (request) =>
    set((state) => {
      if (state.requests.some((pending) => pending.guestId === request.guestId)) {
        return state;
      }
      return { requests: [...state.requests, request] };
    }),
  removeRequest: (guestId) =>
    set((state) => ({
      requests: state.requests.filter((request) => request.guestId !== guestId),
    })),
  clearRequests: () => set({ requests: [] }),
}));
