import { create } from "zustand";
import type { UserType } from "@pockets/shared";

export type PeerConnectionStatus = {
  userName: string;
  userType: UserType;
  state: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
  phase: "waiting" | "signaling" | "connecting" | "connected" | "reconnecting" | "failed";
  issue?: string;
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
        ...state.peers[userId],
        userName: update.userName,
        userType: update.userType,
        state: update.state ?? state.peers[userId]?.state ?? "new",
        iceState: update.iceState ?? state.peers[userId]?.iceState ?? "new",
        phase: update.phase ?? state.peers[userId]?.phase ?? "waiting",
        issue: update.issue ?? (update.phase === "connected" ? undefined : state.peers[userId]?.issue),
        updatedAt: Date.now(),
      },
    },
  })),
  removePeerStatus: (userId) => set((state) => {
    const peers = { ...state.peers };
    delete peers[userId];
    return { peers };
  }),
  clearPeerStatuses: () => set({ peers: {} }),
}));
