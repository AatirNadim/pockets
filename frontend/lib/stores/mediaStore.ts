import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TrackType } from "../types";

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
  remoteTrackState: Record<string, { videoEnabled: boolean; audioEnabled: boolean }>;
};

type MediaActions = {
  addMediaStream: (
    userId: string,
    track: MediaStreamTrack,
    trackType: TrackType
  ) => void;
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
  setRemoteTrackEnabled: (
    userId: string,
    kind: "video" | "audio",
    enabled: boolean
  ) => void;
  clearRemoteTrackState: (userId: string) => void;
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
      remoteTrackState: {},
      addMediaStream: (userId, track, trackType) =>
        set((state) => {
          const existing = state.mediaStreams[userId];
          const targetStream = existing ?? new MediaStream();

          if (existing) {
            existing.getTracks().forEach((currentTrack) => {
              const isVideoTrack = currentTrack.kind === "video";
              if (
                (trackType === TrackType.VIDEO && isVideoTrack) ||
                (trackType === TrackType.AUDIO && !isVideoTrack)
              ) {
                if (currentTrack.id !== track.id) {
                  existing.removeTrack(currentTrack);
                }
              }
            });
          }

          const alreadyPresent = targetStream
            .getTracks()
            .some((currentTrack) => currentTrack.id === track.id);

          if (!alreadyPresent) {
            targetStream.addTrack(track);
          }

          return {
            mediaStreams: {
              ...state.mediaStreams,
              [userId]: targetStream,
            },
            remoteTrackState: {
              ...state.remoteTrackState,
              [userId]: state.remoteTrackState[userId] ?? {
                videoEnabled: true,
                audioEnabled: true,
              },
            },
          };
        }),
      removeMediaStream: (userId) =>
        set((state) => {
          const updatedStreams = { ...state.mediaStreams };
          delete updatedStreams[userId];

          const updatedTrackState = { ...state.remoteTrackState };
          delete updatedTrackState[userId];

          return {
            mediaStreams: updatedStreams,
            remoteTrackState: updatedTrackState,
          };
        }),
      clearMediaStreams: () =>
        set({ mediaStreams: {}, remoteTrackState: {} }),
      toggleAudioOnly: () =>
        set((state) => ({ isAudioOnly: !state.isAudioOnly })),
      setScreenSharing: (isSharing) => set({ isScreenSharing: isSharing }),
      setAvailableCameras: (devices) => set({ availableCameras: devices }),
      setAvailableMicrophones: (devices) =>
        set({ availableMicrophones: devices }),
      setSelectedCameraId: (deviceId) => set({ selectedCameraId: deviceId }),
      setSelectedMicrophoneId: (deviceId) =>
        set({ selectedMicrophoneId: deviceId }),
      setRemoteTrackEnabled: (userId, kind, enabled) =>
        set((state) => {
          const prev = state.remoteTrackState[userId] ?? {
            videoEnabled: true,
            audioEnabled: true,
          };

          const nextState = {
            ...state.remoteTrackState,
            [userId]: {
              videoEnabled:
                kind === TrackType.VIDEO ? enabled : prev.videoEnabled,
              audioEnabled:
                kind === TrackType.AUDIO ? enabled : prev.audioEnabled,
            },
          };

          return { remoteTrackState: nextState };
        }),
      clearRemoteTrackState: (userId) =>
        set((state) => {
          if (!state.remoteTrackState[userId]) {
            return state;
          }

          const next = { ...state.remoteTrackState };
          delete next[userId];
          return { remoteTrackState: next };
        }),
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
