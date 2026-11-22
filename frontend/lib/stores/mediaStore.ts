import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TrackType } from "@pockets/shared";

type MediaDeviceOption = {
  deviceId: string;
  label: string;
};

type MediaState = {
  mediaStreams: Record<string, MediaStream>;
  isAudioOnly: boolean;
  isScreenSharing: boolean;
  isVideoOff: boolean;
  isMicrophoneMuted: boolean;
  isSpeakerOff: boolean;
  availableCameras: MediaDeviceOption[];
  availableMicrophones: MediaDeviceOption[];
  selectedCameraId: string | null;
  selectedMicrophoneId: string | null;
  mediaError: string | null;
  remoteTrackState: Record<
    string,
    { videoEnabled: boolean; audioEnabled: boolean }
  >;
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
  setIsVideoOff: (val: boolean) => void;
  toggleVideoOff: () => void;
  setMicrophoneMuted: (muted: boolean) => void;
  toggleSpeakerOff: () => void;
  setAvailableCameras: (devices: MediaDeviceOption[]) => void;
  setAvailableMicrophones: (devices: MediaDeviceOption[]) => void;
  setSelectedCameraId: (deviceId: string | null) => void;
  setSelectedMicrophoneId: (deviceId: string | null) => void;
  setMediaError: (message: string | null) => void;
  setRemoteTrackEnabled: (
    userId: string,
    kind: "video" | "audio",
    enabled: boolean
  ) => void;
  removeTrackFromStream: (userId: string, trackType: TrackType) => void;
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
      isMicrophoneMuted: false,
      setIsVideoOff: (val) => set({ isVideoOff: val }),
      toggleVideoOff: () => set((state) => ({ isVideoOff: !state.isVideoOff })),
      setMicrophoneMuted: (muted) => set({ isMicrophoneMuted: muted }),
      isSpeakerOff: false,
      toggleSpeakerOff: () =>
        set((state) => ({ isSpeakerOff: !state.isSpeakerOff })),
      availableCameras: [],
      availableMicrophones: [],
      selectedCameraId: null,
      selectedMicrophoneId: null,
      mediaError: null,
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
      clearMediaStreams: () => set({ mediaStreams: {}, remoteTrackState: {} }),
      toggleAudioOnly: () =>
        set((state) => ({ isAudioOnly: !state.isAudioOnly })),
      setScreenSharing: (isSharing) => set({ isScreenSharing: isSharing }),
      setAvailableCameras: (devices) => set({ availableCameras: devices }),
      setAvailableMicrophones: (devices) =>
        set({ availableMicrophones: devices }),
      setSelectedCameraId: (deviceId) => set({ selectedCameraId: deviceId }),
      setSelectedMicrophoneId: (deviceId) =>
        set({ selectedMicrophoneId: deviceId }),
      setMediaError: (message) => set({ mediaError: message }),
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
      removeTrackFromStream: (userId, trackType) =>
        set((state) => {
          const stream = state.mediaStreams[userId];
          if (!stream) {
            return state;
          }

          const tracksToRemove =
            trackType === TrackType.VIDEO
              ? stream.getVideoTracks()
              : stream.getAudioTracks();

          if (!tracksToRemove.length) {
            return state;
          }

          tracksToRemove.forEach((track) => {
            stream.removeTrack(track);
          });

          const nextStreams = { ...state.mediaStreams };
          const remainingTracks = stream.getTracks().length;

          if (remainingTracks === 0) {
            delete nextStreams[userId];
          } else {
            nextStreams[userId] = stream;
          }

          const fallbackTrackState = state.remoteTrackState[userId] ?? {
            videoEnabled: true,
            audioEnabled: true,
          };

          let nextTrackState: typeof state.remoteTrackState | undefined;

          if (remainingTracks === 0) {
            if (state.remoteTrackState[userId]) {
              nextTrackState = { ...state.remoteTrackState };
              delete nextTrackState[userId];
            }
          } else {
            const updatedEntry = {
              videoEnabled:
                trackType === TrackType.VIDEO
                  ? false
                  : fallbackTrackState.videoEnabled,
              audioEnabled:
                trackType === TrackType.AUDIO
                  ? false
                  : fallbackTrackState.audioEnabled,
            };

            nextTrackState = {
              ...state.remoteTrackState,
              [userId]: updatedEntry,
            };
          }

          return nextTrackState
            ? {
                mediaStreams: nextStreams,
                remoteTrackState: nextTrackState,
              }
            : { mediaStreams: nextStreams };
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
        isMicrophoneMuted: state.isMicrophoneMuted,
        isSpeakerOff: state.isSpeakerOff,
      }),
    }
  )
);
