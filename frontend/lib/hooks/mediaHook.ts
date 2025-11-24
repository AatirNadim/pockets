import { create } from "zustand";
import { persist } from "zustand/middleware";

type MediaState = {
  mediaStreams: Record<string, MediaStream>;
  isAudioOnly: boolean;
  isScreenSharing: boolean;
  isVideoOff: boolean;
  isSpeakerOff: boolean;
};

type MediaActions = {
  addMediaStream: (userId: string, stream: MediaStream) => void;
  removeMediaStream: (userId: string) => void;
  clearMediaStreams: () => void;
  toggleAudioOnly: () => void;
  setScreenSharing: (isSharing: boolean) => void;
  toggleVideoOff: () => void;
  toggleSpeakerOff: () => void;
};

export type { MediaState, MediaActions };

export const useMediaStore = create<MediaState & MediaActions>()(
  persist(
    (set, get) => ({
      mediaStreams: {},
      isAudioOnly: false,
      isScreenSharing: false,
      isVideoOff: false,
      toggleVideoOff: () => set((state) => ({ isVideoOff: !state.isVideoOff })),
      isSpeakerOff: false,
      toggleSpeakerOff: () =>
        set((state) => ({ isSpeakerOff: !state.isSpeakerOff })),
      addMediaStream: (userId, stream) =>
        set((state) => ({
          mediaStreams: { ...state.mediaStreams, [userId]: stream },
        })),
      removeMediaStream: (userId) =>
        set((state) => {
          const updatedStreams = { ...state.mediaStreams };
          delete updatedStreams[userId];
          return { mediaStreams: updatedStreams };
        }),
      clearMediaStreams: () => set({ mediaStreams: {} }),
      toggleAudioOnly: () =>
        set((state) => ({ isAudioOnly: !state.isAudioOnly })),
      setScreenSharing: (isSharing) => set({ isScreenSharing: isSharing }),
    }),
    {
      name: "media-storage",
    }
  )
);
