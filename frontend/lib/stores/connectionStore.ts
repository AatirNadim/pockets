import { create } from "zustand";
import type { UserType } from "@pockets/shared";

export type PeerConnectionStatus = {
  userName: string;
  userType: UserType;
  state: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
  updatedAt: number;
};

type ConnectionState = {
  peers: Record<string, PeerConnectionStatus>;
  setPeerStatus: (userId: string, update: Partial<PeerConnectionStatus> & Pick<PeerConnectionStatus, "userName" | "userType">) => void;
  removePeerStatus: (userId: string) => void;
  clearPeerStatuses: () => void;
};

export const useConnectionStore = create<ConnectionState>()((set) => ({
  peers: {},
  setPeerStatus: (userId, update) => set((state) => ({
    peers: {
      ...state.peers,
      [userId]: {
        userName: update.userName,
        userType: update.userType,
        state: update.state ?? state.peers[userId]?.state ?? "new",
        iceState: update.iceState ?? state.peers[userId]?.iceState ?? "new",
        updatedAt: Date.now(),
      },
    },
  })),
  removePeerStatus: (userId) => set((state) => {
    const { [userId]: _removed, ...peers } = state.peers;
    return { peers };
  }),
  clearPeerStatuses: () => set({ peers: {} }),
}));
