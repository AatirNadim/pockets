import { useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";
import { useMediaStore } from "../stores/mediaStore";

const useMedia = () => {
  const localStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const currentVideoDeviceId = useRef<string | null>(null);
  const currentAudioDeviceId = useRef<string | null>(null);

  const {
    selectedCameraId,
    selectedMicrophoneId,
    setAvailableCameras,
    setAvailableMicrophones,
    setSelectedCameraId,
    setSelectedMicrophoneId,
  } = useMediaStore();

  const captureDeviceIdsFromStream = (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    const videoDeviceId = videoTrack?.getSettings().deviceId || null;
    const audioDeviceId = audioTrack?.getSettings().deviceId || null;

    if (!videoDeviceId && !audioDeviceId) {
      console.warn("No video or audio device IDs found in the stream.");
      return;
    }

    if (videoDeviceId) {
      currentVideoDeviceId.current = videoDeviceId;
      if (!selectedCameraId) {
        setSelectedCameraId(videoDeviceId);
      }
    } else {
      console.warn("No video device ID found in the stream.");
    }

    if (audioDeviceId) {
      currentAudioDeviceId.current = audioDeviceId;
      if (!selectedMicrophoneId) {
        setSelectedMicrophoneId(audioDeviceId);
      }
    } else {
      console.warn("No audio device ID found in the stream.");
    }
  };

  const populateAvailableDevices = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return;
    }

    try {
      console.log("Enumerating available media devices...");
      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoInputs = devices
        .filter((device) => device.kind === ("videoinput" as MediaDeviceKind))
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));

      console.log("Video inputs:", videoInputs);

      const audioInputs = devices
        .filter((device) => device.kind === ("audioinput" as MediaDeviceKind))
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
        }));

      console.log("Audio inputs:", audioInputs);

      setAvailableCameras(videoInputs);
      setAvailableMicrophones(audioInputs);

      if (
        selectedCameraId &&
        !videoInputs.some((option) => option.deviceId === selectedCameraId)
      ) {
        setSelectedCameraId(videoInputs[0]?.deviceId ?? null);
      } else if (!selectedCameraId && videoInputs.length) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }

      if (
        selectedMicrophoneId &&
        !audioInputs.some((option) => option.deviceId === selectedMicrophoneId)
      ) {
        setSelectedMicrophoneId(audioInputs[0]?.deviceId ?? null);
      } else if (!selectedMicrophoneId && audioInputs.length) {
        setSelectedMicrophoneId(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error("Error enumerating media devices:", error);
    }
  }, [
    selectedCameraId,
    selectedMicrophoneId,
    setAvailableCameras,
    setAvailableMicrophones,
    setSelectedCameraId,
    setSelectedMicrophoneId,
  ]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      return;
    }

    const mediaDevices = navigator.mediaDevices;
    const handleDeviceChange = () => {
      populateAvailableDevices();
    };

    if (mediaDevices.addEventListener) {
      mediaDevices.addEventListener("devicechange", handleDeviceChange);
      return () => {
        mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      };
    }

    const originalHandler = mediaDevices.ondevicechange;
    mediaDevices.ondevicechange = handleDeviceChange;
    return () => {
      mediaDevices.ondevicechange = originalHandler || null;
    };
  }, [populateAvailableDevices]);

  const replaceLocalTrack = async (
    kind: "video" | "audio",
    deviceId: string
  ): Promise<boolean> => {
    if (!deviceId) {
      return false;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      toast.error("Media devices unavailable", {
        description: "Unable to access browser media APIs.",
      });
      return false;
    }

    try {
      const constraints: MediaStreamConstraints =
        kind === "video"
          ? { video: { deviceId: { exact: deviceId } }, audio: false }
          : { video: false, audio: { deviceId: { exact: deviceId } } };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack =
        kind === "video"
          ? newStream.getVideoTracks()[0]
          : newStream.getAudioTracks()[0];

      if (!newTrack) {
        throw new Error(`No ${kind} track returned for device ${deviceId}`);
      }

      if (!localStream.current) {
        localStream.current = new MediaStream();
      }

      const tracksToReplace =
        kind === "video"
          ? localStream.current.getVideoTracks()
          : localStream.current.getAudioTracks();

      tracksToReplace.forEach((track) => {
        track.stop();
        localStream.current?.removeTrack(track);
      });

      localStream.current.addTrack(newTrack);

      if (kind === "video" && localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.srcObject = localStream.current;
      }

      const appliedDeviceId = newTrack.getSettings().deviceId || deviceId;

      if (kind === "video") {
        currentVideoDeviceId.current = appliedDeviceId;
      } else {
        currentAudioDeviceId.current = appliedDeviceId;
      }
      return true;
    } catch (error) {
      console.error(`Failed to switch ${kind} device:`, error);
      toast.error("Device Switch Failed", {
        description: `Unable to switch ${kind} source. Please try again.`,
      });
      return false;
    }
  };

  const switchCamera = async (deviceId: string) => {
    if (!deviceId) {
      return;
    }

    if (deviceId === currentVideoDeviceId.current) {
      setSelectedCameraId(deviceId);
      return;
    }

    const switched = await replaceLocalTrack("video", deviceId);
    if (switched) {
      setSelectedCameraId(deviceId);
    }
  };

  const switchMicrophone = async (deviceId: string) => {
    if (!deviceId) {
      return;
    }

    if (deviceId === currentAudioDeviceId.current) {
      setSelectedMicrophoneId(deviceId);
      return;
    }

    const switched = await replaceLocalTrack("audio", deviceId);
    if (switched) {
      setSelectedMicrophoneId(deviceId);
    }
  };

  const createMediaStreams = async () => {
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error("Media devices API unavailable");
      }

      // if no selected devices, get default devices
      const constraints: MediaStreamConstraints = {
        audio: selectedMicrophoneId
          ? { deviceId: { exact: selectedMicrophoneId } }
          : true,
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : true,
      };

      // creating both audio and video tracks
      localStream.current = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      if (localVideoRef.current) {
        console.debug("Accessing local media streams...");
        localVideoRef.current.srcObject = localStream.current;
      }

      captureDeviceIdsFromStream(localStream.current);
      await populateAvailableDevices();
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error(
        "Could not access camera or microphone. Please check permissions and try again."
      );
    }
  };

  const cleanUpMediaDevices = () => {
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    currentVideoDeviceId.current = null;
    currentAudioDeviceId.current = null;
  };

  return {
    localStream,
    localVideoRef,
    populateAvailableDevices,
    switchCamera,
    switchMicrophone,
    createMediaStreams,
    cleanUpMediaDevices,
  };
};

export default useMedia;
