import { create } from "zustand";
import { persist } from "zustand/middleware";

type MediaDeviceOption = {
  deviceId: string;
  label: string;
};

type MediaState = {
  mediaStreams: Record<string, MediaStream>;
  isAudioOnly: boolean;
  isScreenSharing: boolean;
  isVideoOff: boolean;
  isSpeakerOff: boolean;
  availableCameras: MediaDeviceOption[];
  availableMicrophones: MediaDeviceOption[];
  selectedCameraId: string | null;
  selectedMicrophoneId: string | null;
};

type MediaActions = {
  addMediaStream: (userId: string, stream: MediaStream) => void;
  removeMediaStream: (userId: string) => void;
  clearMediaStreams: () => void;
  toggleAudioOnly: () => void;
  setScreenSharing: (isSharing: boolean) => void;
  toggleVideoOff: () => void;
  toggleSpeakerOff: () => void;
  setAvailableCameras: (devices: MediaDeviceOption[]) => void;
  setAvailableMicrophones: (devices: MediaDeviceOption[]) => void;
  setSelectedCameraId: (deviceId: string | null) => void;
  setSelectedMicrophoneId: (deviceId: string | null) => void;
};

export type { MediaState, MediaActions, MediaDeviceOption };

export const useMediaStore = create<MediaState & MediaActions>()(
  persist(
    (set) => ({
      mediaStreams: {},
      isAudioOnly: false,
      isScreenSharing: false,
      isVideoOff: false,
      toggleVideoOff: () => set((state) => ({ isVideoOff: !state.isVideoOff })),
      isSpeakerOff: false,
      toggleSpeakerOff: () =>
        set((state) => ({ isSpeakerOff: !state.isSpeakerOff })),
      availableCameras: [],
      availableMicrophones: [],
      selectedCameraId: null,
      selectedMicrophoneId: null,
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
      setAvailableCameras: (devices) => set({ availableCameras: devices }),
      setAvailableMicrophones: (devices) =>
        set({ availableMicrophones: devices }),
      setSelectedCameraId: (deviceId) => set({ selectedCameraId: deviceId }),
      setSelectedMicrophoneId: (deviceId) =>
        set({ selectedMicrophoneId: deviceId }),
    }),
    {
      name: "media-storage",
      partialize: (state) => ({
        isAudioOnly: state.isAudioOnly,
        isScreenSharing: state.isScreenSharing,
        isVideoOff: state.isVideoOff,
        isSpeakerOff: state.isSpeakerOff,
      }),
    }
  )
);
