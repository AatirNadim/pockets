import { useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";
import { useMediaStore } from "../stores/mediaStore";
import { audioLevelManager } from "@/lib/utils/audioLevelManager";
import { useUserStore } from "../stores/userStore";

const useMedia = () => {
  const localStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const currentVideoDeviceId = useRef<string | null>(null);
  const currentAudioDeviceId = useRef<string | null>(null);
  const audioSendersRef = useRef<Record<string, RTCRtpSender | null>>({});
  const videoSendersRef = useRef<Record<string, RTCRtpSender | null>>({});

  const { userId } = useUserStore();

  const {
    selectedCameraId,
    selectedMicrophoneId,
    setAvailableCameras,
    setAvailableMicrophones,
    setSelectedCameraId,
    setSelectedMicrophoneId,
    setMediaError,
    setIsVideoOff,
    setMicrophoneMuted,
  } = useMediaStore();

  const handleRemoteSenderLeft = useCallback((userId: string) => {
    delete audioSendersRef.current[userId];
    delete videoSendersRef.current[userId];
  }, []);

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
      void populateAvailableDevices().then(async () => {
        const devices = await mediaDevices.enumerateDevices();
        const videoIds = new Set(devices.filter((device) => device.kind === "videoinput").map((device) => device.deviceId));
        const audioIds = new Set(devices.filter((device) => device.kind === "audioinput").map((device) => device.deviceId));
        if (currentVideoDeviceId.current && !videoIds.has(currentVideoDeviceId.current)) {
          setIsVideoOff(true);
          setMediaError("Your camera was disconnected. Choose another camera from the device menu.");
        }
        if (currentAudioDeviceId.current && !audioIds.has(currentAudioDeviceId.current)) {
          setMicrophoneMuted(true);
          setMediaError("Your microphone was disconnected. Choose another microphone from the device menu.");
        }
      }).catch(() => undefined);
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
  }, [populateAvailableDevices, setIsVideoOff, setMediaError, setMicrophoneMuted]);

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

  const watchLocalTrack = (track: MediaStreamTrack) => {
    track.addEventListener("ended", () => {
      const message = track.kind === "video"
        ? "Your camera stopped. Check that it is connected and available."
        : "Your microphone stopped. Check that it is connected and available.";
      if (track.kind === "video") setIsVideoOff(true);
      else {
        setMicrophoneMuted(true);
        if (userId) audioLevelManager.stopAnalyzing(userId);
      }
      setMediaError(message);
      toast.error(message);
    }, { once: true });
  };

  const getNewTrackForTrackType = async (
    kind: "video" | "audio",
    deviceId?: string
  ): Promise<MediaStreamTrack | null> => {
    console.log("getting new track for", kind, "with deviceId:", deviceId);

    const constraints: MediaStreamConstraints =
      kind === "video"
        ? {
            video: deviceId
              ? { deviceId: { exact: deviceId } }
              : currentVideoDeviceId.current
              ? {
                  deviceId: { exact: currentVideoDeviceId.current },
                }
              : true,
            audio: false,
          }
        : {
            video: false,
            audio: deviceId
              ? { deviceId: { exact: deviceId } }
              : currentAudioDeviceId.current
              ? { deviceId: { exact: currentAudioDeviceId.current } }
              : true,
          };

    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("obtained new stream for", kind, newStream);

    return kind === "video"
      ? newStream.getVideoTracks()[0]
      : newStream.getAudioTracks()[0];
  };

  const attachTrackToLocalStream = async (
    newTrack: MediaStreamTrack | null,
    kind: "video" | "audio"
  ) => {
    if (!newTrack) {
      throw new Error(
        `No ${kind} track provided for attachment to local stream`
      );
    }

    if (!localStream.current) {
      localStream.current = new MediaStream();
    }

    const tracksToReplace =
      kind === "video"
        ? localStream.current.getVideoTracks()
        : localStream.current.getAudioTracks();

    // remove all the existing tracks of this kind
    tracksToReplace.forEach((track) => {
      track.stop();
      localStream.current?.removeTrack(track);
    });
    console.log("removed existing", kind, "tracks from local stream");

    // add the new track (this will be the only track of this kind now)
    localStream.current.addTrack(newTrack);
    console.log("added new", kind, "track to local stream:", newTrack);
    watchLocalTrack(newTrack);

    // update the video element if it's a video track
    if (kind === "video" && localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.srcObject = localStream.current;
    }

    // restart audio level analysis if it's an audio track
    if (kind === "audio" && userId) {
      console.log("restarting audio level analysis for local track change...");
      audioLevelManager.startAnalyzing(userId, newTrack);
    }
  };

  const replaceLocalTrackForPeers = async (
    kind: "video" | "audio",
    peerConnections: Record<string, RTCPeerConnection>,
    deviceId?: string
  ): Promise<boolean> => {
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
      // get new track for the requested device
      const newTrack = await getNewTrackForTrackType(kind, deviceId);

      if (!newTrack) {
        console.error(
          `No new track obtained for ${kind} with deviceId:`,
          deviceId
        );
        throw new Error(`Error creating new track for tracktype ${kind}`);
      }

      if (deviceId) {
        const { isVideoOff, isMicrophoneMuted } = useMediaStore.getState();
        newTrack.enabled = kind === "video" ? !isVideoOff : !isMicrophoneMuted;
      }

      // attach the new track to local stream
      await attachTrackToLocalStream(newTrack, kind);

      // inform all peers about the track change
      await replaceTrackForPeers(kind, newTrack, peerConnections);

      // update the current media device id
      const appliedDeviceId = newTrack.getSettings().deviceId;

      if (kind === "video") {
        currentVideoDeviceId.current = appliedDeviceId ?? null;
        setSelectedCameraId(currentVideoDeviceId.current);
      } else {
        currentAudioDeviceId.current = appliedDeviceId ?? null;
        setSelectedMicrophoneId(currentAudioDeviceId.current);
        console.log(
          "current audio device id --> ",
          currentAudioDeviceId.current
        );
      }

      return true;
    } catch (error) {
      console.error(`Failed to switch ${kind} device:`, error);
      const device = kind === "video" ? "camera" : "microphone";
      toast.error(deviceId ? `Could not switch ${device}` : `Could not turn on the ${device}`, {
        description: "Check that the device is connected and that browser permissions are enabled.",
      });
      return false;
    }
  };

  const switchCameraForPeers = async (
    deviceId: string,
    peerConnections: Record<string, RTCPeerConnection>
  ) => {
    if (!deviceId) {
      return;
    }
    console.log("switching camera to deviceId:", deviceId);

    if (deviceId === currentVideoDeviceId.current) {
      setSelectedCameraId(deviceId);
      return;
    }

    if (await replaceLocalTrackForPeers("video", peerConnections, deviceId)) {
      toast.success("Camera switched", { id: "room-camera-device" });
    }
    if (currentVideoDeviceId.current) {
      setSelectedCameraId(currentVideoDeviceId.current);
    }
  };

  const switchMicrophoneForPeers = async (
    deviceId: string,
    peerConnections: Record<string, RTCPeerConnection>
  ) => {
    if (!deviceId) {
      return;
    }

    console.log("switching microphone to deviceId:", deviceId);

    if (deviceId === currentAudioDeviceId.current) {
      setSelectedMicrophoneId(deviceId);
      return;
    }

    if (await replaceLocalTrackForPeers("audio", peerConnections, deviceId)) {
      toast.success("Microphone switched", { id: "room-microphone-device" });
    }
    if (currentAudioDeviceId.current) {
      setSelectedMicrophoneId(currentAudioDeviceId.current);
    }
  };

  const replaceTrackForPeers = async (
    kind: "video" | "audio",
    track: MediaStreamTrack | null,
    peerConnections: Record<string, RTCPeerConnection>
  ) => {
    console.log(
      `replacing ${kind} track for all peers to the new track:`,
      track
    );

    console.log("current audio senders ref:", audioSendersRef.current);
    console.log("current video senders ref:", videoSendersRef.current);
    console.log("current peer connections:", peerConnections);

    if (
      !audioSendersRef.current ||
      !videoSendersRef.current ||
      !peerConnections
    ) {
      console.warn("Sender refs or peer connections not initialized");
      return;
    }

    const senderRegistry =
      kind === "audio" ? audioSendersRef.current : videoSendersRef.current;

    const peerEntries = Object.entries(peerConnections);

    await Promise.all(
      peerEntries.map(async ([remoteUserId, pc]) => {
        let sender = senderRegistry[remoteUserId];

        if (!sender && track && localStream.current) {
          sender = pc.addTrack(track, localStream.current as MediaStream);
          if (kind === "audio") {
            audioSendersRef.current[remoteUserId] = sender;
          } else {
            videoSendersRef.current[remoteUserId] = sender;
          }
          return;
        }

        if (!sender) {
          return;
        }

        try {
          console.log(
            `Replacing ${kind} track for peer ${remoteUserId}..., sender: `,
            sender
          );
          await sender.replaceTrack(track);
        } catch (error) {
          console.error(
            `Failed to replace ${kind} track for peer ${remoteUserId}`,
            error
          );
        }
      })
    );
  };

  const createMediaStreams = async () => {
    const previousStream = localStream.current;
    if (previousStream) {
      previousStream.getTracks().forEach((track) => track.stop());
      if (localVideoRef.current?.srcObject === previousStream) {
        localVideoRef.current.srcObject = null;
      }
      localStream.current = null;
    }

    try {
      const { isMicrophoneMuted, isVideoOff } = useMediaStore.getState();
      if (isMicrophoneMuted && isVideoOff) {
        localStream.current = new MediaStream();
        setMediaError(null);
        return localStream.current;
      }
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Media devices API unavailable");
      }

      const constraints: MediaStreamConstraints = {
        audio: isMicrophoneMuted ? false : selectedMicrophoneId
          ? { deviceId: { exact: selectedMicrophoneId } }
          : true,
        video: isVideoOff ? false : selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : true,
      };

      try {
        localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (captureError) {
        const reason = captureError instanceof DOMException ? captureError.name : "";
        if (!["NotFoundError", "OverconstrainedError", "NotReadableError"].includes(reason)) throw captureError;
        const tracks: MediaStreamTrack[] = [];
        const failures: string[] = [];
        for (const kind of ["audio", "video"] as const) {
          if ((kind === "audio" && isMicrophoneMuted) || (kind === "video" && isVideoOff)) continue;
          try {
            const stream = await navigator.mediaDevices.getUserMedia(kind === "audio" ? { audio: true, video: false } : { audio: false, video: true });
            tracks.push(...stream.getTracks());
          } catch {
            failures.push(kind === "audio" ? "microphone" : "camera");
          }
        }
        localStream.current = new MediaStream(tracks);
        if (!tracks.length) throw captureError;
        const message = failures.length ? `Could not start your ${failures.join(" and ")}. You can still join with the available media.` : null;
        setMediaError(message);
        if (message) toast.warning("Some media is unavailable", { description: message });
      }
      if (localVideoRef.current) {
        console.debug("Accessing local media streams...");
        localVideoRef.current.srcObject = localStream.current;
      }

      if (!localStream.current.getAudioTracks().length) setMicrophoneMuted(true);
      if (!localStream.current.getVideoTracks().length) setIsVideoOff(true);
      captureDeviceIdsFromStream(localStream.current);
      localStream.current.getTracks().forEach(watchLocalTrack);
      await populateAvailableDevices();
      if (localStream.current.getTracks().length) setMediaError(null);
      return localStream.current;
    } catch (error) {
      setMicrophoneMuted(true);
      setIsVideoOff(true);
      console.error("Error accessing media devices:", error);
      const reason = error instanceof DOMException ? error.name : "";
      const message = reason === "NotAllowedError" || reason === "SecurityError"
        ? "Camera or microphone access was denied. You can continue without media; update browser permissions and try turning it on."
        : reason === "NotFoundError"
        ? "No camera or microphone was found. You can continue without media."
        : "Camera and microphone could not start. Check device access and try again.";
      setMediaError(message);
      toast.error("Media unavailable", { description: message });
      return null;
    }
  };

  const startAudioAnalysis = (
    remoteUserId: string,
    track: MediaStreamTrack
  ) => {
    audioLevelManager.startAnalyzing(remoteUserId, track);
  };

  const markAudioAsSilentForUser = (userId: string) => {
    console.log("marking audio as silent for user:", userId);
  };

  const stopAudioAnalysis = (userId: string) => {
    console.log("stopping audio analysis for user:", userId);
    audioLevelManager.stopAnalyzing(userId);
  };

  const cleanUpMediaDevices = () => {
    // stop all audio analysis

    audioLevelManager.stopAll();

    // stop all tracks and clear refs
    localStream.current?.getTracks().forEach((track) => track.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    localStream.current = null;

    // clear device ids and sender refs
    currentVideoDeviceId.current = null;
    currentAudioDeviceId.current = null;

    // set senders info to null
    audioSendersRef.current = {};
    videoSendersRef.current = {};
    setMediaError(null);
  };

  return {
    localStream,
    localVideoRef,
    currentAudioDeviceId,
    currentVideoDeviceId,
    audioSendersRef,
    videoSendersRef,
    handleRemoteSenderLeft,
    populateAvailableDevices,
    switchCameraForPeers,
    switchMicrophoneForPeers,
    createMediaStreams,
    cleanUpMediaDevices,
    replaceTrackForPeers,
    replaceLocalTrackForPeers,
    startAudioAnalysis,
    stopAudioAnalysis,
    markAudioAsSilentForUser,
    // replaceTrackForPeers,
  };
};

export default useMedia;
