import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "../stores/userStore";
import { serverPath, UserType } from "@/lib/constants";

import { toast } from "sonner";
import { useJoinRequestStore } from "../stores/joinRequestStore";
import { useChatStore } from "../stores/chatStore";
import { useFileStore } from "../stores/fileStore";
import {
  WebSocketMessage,
  JoinRoomMessage,
  JoinRequestDecisionMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  LeaveRoomMessage,
} from "@/lib/types";
import { useMediaStore } from "../stores/mediaStore";
import { useFile } from "./fileHook";
import type {
  ChatDataEnvelope,
  ChatMessage,
  FileDownloadRequest,
  FileDownloadResponse,
} from "../types";

export const useSocket = () => {
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const dataChannelMap = useRef<Record<string, RTCDataChannel | null>>({});

  const [status, setStatus] = useState("Connecting to room...");
  const [isConnected, setIsConnected] = useState(false);
  const [isRoomFull, setIsRoomFull] = useState(false);
  const localStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const currentVideoDeviceId = useRef<string | null>(null);
  const currentAudioDeviceId = useRef<string | null>(null);

  const {
    userId,
    userName,
    userType,
    roomId,
    remoteUsers,
    addRemoteUser,
    removeRemoteUser,
    leaveRoom,
  } = useUserStore();

  const {
    filesToBeSent,
    clearFilesToBeSent,
    resetFileStore,
    getLocalFileEntry,
  } = useFileStore((state) => ({
    filesToBeSent: state.filesToBeSent,
    clearFilesToBeSent: state.clearFilesToBeSent,
    resetFileStore: state.resetFileStore,
    getLocalFileEntry: state.getLocalFileEntry,
  }));

  const addChatMessage = useChatStore((state) => state.addChatMessage);
  const incrementUnreadCount = useChatStore(
    (state) => state.incrementUnreadCount
  );
  const resetUnreadCount = useChatStore((state) => state.resetUnreadCount);
  const clearChatMessages = useChatStore((state) => state.clearChatMessages);

  const {
    selectedCameraId,
    selectedMicrophoneId,
    setAvailableCameras,
    setAvailableMicrophones,
    setSelectedCameraId,
    setSelectedMicrophoneId,
    addMediaStream,
    removeMediaStream,
    clearMediaStreams,
  } = useMediaStore();

  const addJoinRequest = useJoinRequestStore((state) => state.addRequest);
  const removeJoinRequestFromStore = useJoinRequestStore(
    (state) => state.removeRequest
  );
  const clearJoinRequests = useJoinRequestStore((state) => state.clearRequests);

  const { sendFile, sendFilesToUser, registerIncomingTransferChannel } =
    useFile({
      peerConnections,
      dataChannelMap,
    });

  const sendEnvelope = (
    envelope: ChatDataEnvelope,
    targetUserId?: string
  ): boolean => {
    const payload = JSON.stringify(envelope);

    if (targetUserId) {
      const channel = dataChannelMap.current[targetUserId];
      if (channel?.readyState === "open") {
        try {
          channel.send(payload);
          return true;
        } catch (error) {
          console.error("Failed to deliver envelope to target", error);
        }
      }

      toast.error("Message delivery failed", {
        description: "Unable to reach the requested participant.",
      });
      return false;
    }

    let deliveredChannels = 0;
    Object.values(dataChannelMap.current).forEach((channel) => {
      if (channel?.readyState === "open") {
        try {
          channel.send(payload);
          deliveredChannels += 1;
        } catch (error) {
          console.error("Failed to broadcast envelope", error);
        }
      }
    });

    if (
      deliveredChannels === 0 &&
      Object.keys(peerConnections.current).length > 0
    ) {
      toast.error("Chat delivery failed", {
        description:
          "No active data channels available. Message will not reach others.",
      });
    }

    return deliveredChannels > 0;
  };

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

      // TODO: Handle audio element if needed
      Object.values(peerConnections.current).forEach((pc) => {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind === kind) {
            sender.replaceTrack(newTrack);
          }
        });
      });

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

  const registerListenersForSocket = (socket: WebSocket) => {
    try {
      socket.onopen = () => {
        setStatus("Joining room...");

        if (!roomId || !userId || !userName || !userType) {
          console.error("Room ID, User ID or User Name is not set");
          return;
        }

        const msg: JoinRoomMessage = {
          type: "join-room",
          roomId,
          userId,
          userName,
          userType,
        };

        console.log("Joining room with message: ", msg);
        // Join the room automatically with user info
        socket.send(JSON.stringify(msg));

        console.debug("WebSocket connection established");
        setStatus(
          userType === UserType.GUEST
            ? "Waiting for host approval..."
            : "Waiting for other users..."
        );
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleSignalingMessage(message);
      };

      socket.onclose = () => {
        setStatus("Disconnected from server");
        setIsConnected(false);
        toast.error("Disconnected", {
          description:
            "Disconnected from signaling server. Returning to home page.",
        });
        leaveRoom();
        clearChatMessages();
        resetUnreadCount();
        resetFileStore();
        clearMediaStreams();
        clearJoinRequests();
      };

      socket.onerror = () => {
        toast.error("Connection Error", {
          description: "Failed to connect to signaling server",
        });
        setStatus("Connection failed");
        leaveRoom();
        clearChatMessages();
        resetUnreadCount();
        resetFileStore();
        clearMediaStreams();
        clearJoinRequests();
      };
    } catch (error) {
      console.error("Error registering WebSocket listeners:", error);
    }
  };

  const createWSConnection = () => {
    try {
      if (!userId || !userName || !userType) {
        console.error("User ID/Name/Type is not initialized");
        return;
      }

      if (!roomId) {
        console.error("Room ID is not set");
        return;
      }

      console.log("room created with ID:", roomId);
      console.log("user details:", userId, userName, userType);

      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${wsProtocol}://${serverPath}`);
      socketRef.current = socket;

      registerListenersForSocket(socket);
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      toast.error("Connection Error", {
        description: "Failed to connect to signaling server",
      });
      setStatus("Connection failed");
      throw error;
    }
  };

  const connectToRoom = async () => {
    try {
      clearChatMessages();
      resetUnreadCount();
      console.log("connecting to room...");
      await createMediaStreams();
      createWSConnection();
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
    } finally {
    }
  };

  const handleSignalingMessage = async (message: WebSocketMessage) => {
    console.debug("Received signaling message: ", message);
    switch (message.type) {
      case "user-joined":
        console.log(
          "a new user has joined the room, creating a peer connection..."
        );
        createPeerConnection(message.userId, message.userName);
        await createOffer(message.userId);
        break;

      case "offer":
        await handleOffer(message);
        break;

      case "answer":
        await handleAnswer(message);
        break;

      case "ice-candidate":
        await handleIceCandidate(message);
        break;

      case "user-left":
        console.debug(
          `Remote user ${message.userId} has left the room. Peer connection closed.`
        );

        toast.info("Remote User Left", {
          description: `User with ID ${message.userId} has left the room.`,
        });

        handleRemoteUserLeft(message.userId);
        toast.error("User Left", {
          description: "The other user has left the room.",
        });
        break;

      case "error":
        setStatus("Connection failed");
        setIsConnected(false);
        toast.error("Error", {
          description: message.message || "An error occurred",
        });
        cleanUp();
        router.push("/");
        break;

      case "room-full":
        setIsRoomFull(true);
        toast.error("Room is Full", {
          description: "This room has reached its maximum capacity of 6 users.",
          duration: 5000,
          closeButton: true,
        });
        break;

      case "join-request":
        if (userType === UserType.HOST && message.guest) {
          addJoinRequest({
            roomId: message.roomId,
            guestId: message.guest.id,
            guestName: message.guest.name,
          });
          toast.info("Join Request", {
            description: `${message.guest.name} wants to join the room.`,
          });
        }
        break;

      case "join-request-accepted":
        if (message.guestUserId === userId) {
          setStatus("Host accepted your request. Connecting...");
          toast.success("Request Accepted", {
            description: `${
              message.hostName ?? "Host"
            } approved your request. Setting up the call...`,
          });
        }
        break;

      case "join-request-rejected":
        if (message.guestUserId === userId) {
          setStatus("Host rejected your request");
          toast.error("Request Rejected", {
            description: `${
              message.hostName ?? "Host"
            } declined your request to join.`,
          });
          cleanUp();
        }
        if (userType === UserType.HOST) {
          removeJoinRequestFromStore(message.guestUserId);
        }
        break;

      case "host-closed-room":
        if (userType === UserType.GUEST) {
          toast.error("Room Closed", {
            description: "The host ended this room. Returning to the lobby...",
          });
          setStatus("Host ended the room");
          cleanUp();
          router.push("/");
        }
        break;
    }
  };

  const sendWsMessage = (message: WebSocketMessage) => {
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(message));
      } else {
        console.error("WebSocket is not open. Cannot send message.");
      }
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
    }
  };

  const respondToJoinRequest = (
    guestId: string,
    decision: "accept" | "reject"
  ) => {
    if (!roomId || !userId || userType !== UserType.HOST) {
      console.error("Cannot respond to join request without host context.");
      return;
    }

    const payload: JoinRequestDecisionMessage = {
      type:
        decision === "accept"
          ? "join-request-accepted"
          : "join-request-rejected",
      roomId,
      hostUserId: userId,
      guestUserId: guestId,
    };

    sendWsMessage(payload);
    removeJoinRequestFromStore(guestId);
  };

  const registerPCEventHandlers = (
    pc: RTCPeerConnection,
    remoteUserId: string,
    remoteUserName: string
  ) => {
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.debug("Sending ICE candidate:", "to remote user:");

        if (!roomId || !userId) {
          throw new Error("Room ID or User ID is not set");
        }

        sendWsMessage({
          type: "ice-candidate",
          roomId,
          fromUserId: userId,
          toUserId: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connected":
          if (remoteUsers[remoteUserId]) return;
          console.debug(
            `Connection established with remote user ${remoteUserId}`
          );
          console.log(
            "adding remote user to store...",
            remoteUserId,
            remoteUserName
          );
          addRemoteUser(remoteUserId, remoteUserName);
          setIsConnected(true);
          setStatus("Connected to peer(s)...");
          toast.success("New User Joined", {
            description: `A new user, ${remoteUserName}, with ID ${remoteUserId} joined the room.`,
          });
          break;
        case "disconnected":
          console.warn(
            `Connection with remote user ${remoteUserId} disconnected. Reconnecting...`
          );

          break;
        case "failed":
          console.warn(
            `Connection with remote user ${remoteUserId} lost. Attempting to reconnect...`
          );

          toast.error("Connection lost with User", {
            description: `Connection with user ${remoteUserName} lost.`,
          });
          handleRemoteUserLeft(remoteUserId);
          break;
        case "closed":
          console.warn(`Connection with remote user ${remoteUserId} closed.`);
          toast.info("Connection Closed", {
            description: `Connection with user ${remoteUserName} has been closed.`,
          });
          handleRemoteUserLeft(remoteUserId);

          break;
        default:
          console.debug(
            `Unhandled behaviour: Connection state with remote user ${remoteUserId}: ${pc.connectionState}`
          );
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.debug(
        `ICE connection state with ${remoteUserId}: ${pc.iceConnectionState}`
      );

      switch (pc.iceConnectionState) {
        case "disconnected":
          toast.warning("ICE Disconnected", {
            description: `ICE connection with user ${remoteUserName} disconnected.`,
          });
          break;
        case "failed":
          console.error("ICE connection failed, attempting restart");
          pc.restartIce();
          break;
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(
        `ICE gathering state with ${remoteUserId}: ${pc.iceGatheringState}`
      );
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      if (channel.label === "chat") {
        dataChannelMap.current[remoteUserId] = channel;
        console.debug(
          `Chat channel established with remote user ${remoteUserId}:`,
          channel
        );
        registerDataChannelListeners(channel, remoteUserId);
        return;
      }

      console.debug(
        `File transfer channel established with ${remoteUserId}:`,
        channel.label
      );
      registerIncomingTransferChannel(channel, remoteUserId);
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        addMediaStream(remoteUserId, remoteStream);
      }
    };
  };

  const createPeerConnection = (
    remoteUserId: string,
    remoteUserName: string
  ) => {
    try {
      console.debug(
        "Creating new RTCPeerConnection with remote user ID:",
        remoteUserId,
        remoteUserName
      );

      if (!userId || !userName) {
        throw new Error("User not initialized");
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
            ],
          },
        ],
        iceCandidatePoolSize: 10,
      });

      // registering peer connection event handlers
      console.log("running pc event handler registration...");

      registerPCEventHandlers(pc, remoteUserId, remoteUserName);

      peerConnections.current[remoteUserId] = pc;

      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStream.current as MediaStream);
        });
      } else {
        console.warn(
          "Local media stream not ready when creating peer connection."
        );
      }

      console.info(
        "new peer connection created and added to records for user:",
        remoteUserId
      );
    } catch (error) {
      console.error("Error creating peer connection:", error);
      toast.error("Peer Connection Failed", {
        description: "Failed to create WebRTC peer connection.",
      });
    }
  };

  const createOffer = async (remoteUserId: string) => {
    try {
      console.debug("Creating offer for remote user:", remoteUserId);

      if (!userId || !userName || !userType) {
        throw new Error("User not initialized");
      }

      if (!roomId) {
        throw new Error("Room ID is not set");
      }

      if (!peerConnections.current[remoteUserId]) {
        throw new Error(`Peer connection not found for user: ${remoteUserId}`);
      }

      const pc = peerConnections.current[remoteUserId];

      // create data channel for file transfer, so that it is ready when offer is created
      // this ensures that the data channel is negotiated along with the offer/answer exchange

      console.debug(
        "Creating data channel for file transfer with remote user after answer:",
        remoteUserId
      );

      const dataChannel = pc.createDataChannel("chat", {
        ordered: true,
      });

      dataChannelMap.current[remoteUserId] = dataChannel;

      console.debug(
        "Data channel created after answer:",
        dataChannelMap.current[remoteUserId]
      );

      registerDataChannelListeners(dataChannel, remoteUserId);

      console.debug("Creating offer for remote user:", remoteUserId);

      const offer = await pc.createOffer();

      console.debug("Setting local description with offer:", offer);

      await pc.setLocalDescription(offer);

      sendWsMessage({
        type: "offer",
        fromUserId: userId,
        fromUserName: userName,
        fromUserType: userType,
        toUserId: remoteUserId,
        offer,
        roomId,
      });
      console.debug("Offer sent to remote user:", remoteUserId);
    } catch (error) {
      console.error("Error creating offer:", error);
      toast.error("Offer Creation Failed", {
        description: "Failed to create WebRTC offer.",
      });
    }
  };

  const handleOffer = async (msg: OfferMessage) => {
    try {
      if (!userId || !userName || !userType) {
        throw new Error("User not initialized");
      }

      console.log("Handling offer from remote user:", msg.fromUserId);

      const { fromUserId, offer } = msg;
      let pc = peerConnections.current[fromUserId];

      // creating peer connection for the first time with the existing client, when they send an offer
      if (!pc) {
        console.log(
          "recieved an offer from a new remote user, creating peer connection..."
        );
        createPeerConnection(msg.fromUserId, msg.fromUserName);
        pc = peerConnections.current[fromUserId];
        console.log("Created new peer connection for user:", fromUserId);
      }

      console.log("Handling offer from remote user:", fromUserId);
      console.log("Received offer:", offer);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      console.log("Remote description set with offer:", offer);

      if (!roomId) {
        throw new Error("Room ID is not set");
      }

      // Create an answer to send back
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("Created answer:", answer);

      sendWsMessage({
        type: "answer",
        roomId,
        fromUserId: userId,
        fromUserName: userName,
        fromUserType: userType,
        toUserId: fromUserId,
        answer,
      });
    } catch (error) {
      console.error("Error handling offer:", error);
      toast.error("Offer Handling Failed", {
        description: "Failed to handle WebRTC offer.",
      });
    }
  };

  const handleAnswer = async (msg: AnswerMessage) => {
    try {
      if (!peerConnections.current[msg.fromUserId]) {
        throw new Error(
          `Peer connection not found for user: ${msg.fromUserId}`
        );
      }

      const pc = peerConnections.current[msg.fromUserId];

      console.debug("Handling answer from remote user:", msg.fromUserId);

      console.debug("Received answer:", msg.answer);

      await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));

      console.debug("Remote description set with answer:", msg.answer);
    } catch (error) {
      console.error("Error handling answer:", error);
      toast.error("Answer Handling Failed", {
        description: "Failed to handle WebRTC answer.",
      });
    }
  };

  const handleIceCandidate = async (msg: IceCandidateMessage) => {
    try {
      if (!peerConnections.current[msg.fromUserId]) {
        throw new Error(
          `Peer connection not found for user: ${msg.fromUserId}`
        );
      }

      const pc = peerConnections.current[msg.fromUserId];

      if (!pc.remoteDescription) {
        console.warn(
          "Remote description not set yet, waiting for offer/answer"
        );
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));

      console.debug("ICE candidate added to peer connection");
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
      toast.error("ICE Candidate Handling Failed", {
        description: "Failed to handle WebRTC ICE candidate.",
      });
    }
  };

  const handleRemoteUserLeft = (remoteUserId: string) => {
    console.log(
      "recieved an event that remote user left the room:",
      remoteUserId
    );
    try {
      peerConnections.current[remoteUserId]?.close();
      delete peerConnections.current[remoteUserId];
      delete dataChannelMap.current[remoteUserId];

      if (Object.keys(peerConnections.current).length === 0) {
        setStatus("Waiting for other users...");
      } else if (Object.keys(peerConnections.current).length === 1) {
        setIsConnected(false);
      }

      removeRemoteUser(remoteUserId);
      removeMediaStream(remoteUserId);
      // if there is only a single peer connection left and its connectivity is failed,
      // set isConnected to false
    } catch (error) {
      console.error("Error handling remote user left:", error);
      toast.error("Error handling Remote User Left", {
        description: `Failed to handle remote user ${remoteUserId} leaving the room.: ${error}`,
      });
    }
  };

  const handleIncomingChatMessage = (incoming: ChatMessage) => {
    addChatMessage(incoming);

    const isLocalMessage = incoming.userId === userId;
    const { showChat } = useChatStore.getState();

    if (!isLocalMessage && !showChat) {
      incrementUnreadCount();
    }
  };

  const handleDownloadRequest = async (payload: FileDownloadRequest) => {
    if (!userId || payload.ownerId !== userId) {
      return;
    }

    try {
      const entry = getLocalFileEntry(payload.fileId);
      if (!entry) {
        sendEnvelope(
          {
            kind: "file-download-response",
            payload: {
              ...payload,
              status: "unavailable",
              reason: "File is no longer available.",
            },
          },
          payload.requesterId
        );
        return;
      }

      sendEnvelope(
        {
          kind: "file-download-response",
          payload: {
            ...payload,
            status: "accepted",
          },
        },
        payload.requesterId
      );

      await sendFilesToUser(payload.requesterId, [payload.fileId]);
    } catch (error) {
      console.error("Failed to fulfill download request", error);
      sendEnvelope(
        {
          kind: "file-download-response",
          payload: {
            ...payload,
            status: "rejected",
            reason: "Failed to send the requested file.",
          },
        },
        payload.requesterId
      );
    }
  };

  const handleDownloadResponse = (payload: FileDownloadResponse) => {
    if (!userId || payload.requesterId !== userId) {
      return;
    }

    if (payload.status === "accepted") {
      toast.info("Download approved", {
        description: "Peer accepted your request. Transfer will start shortly.",
      });
      return;
    }

    const reason =
      payload.reason ||
      (payload.status === "unavailable"
        ? "Peer could not locate the file."
        : "Peer declined the download request.");

    toast.error("Download unavailable", {
      description: reason,
    });
  };

  const registerDataChannelListeners = (
    channel: RTCDataChannel,
    remoteUserId?: string
  ) => {
    channel.onopen = () => {
      console.log(
        "Data channel is open:",
        channel.label,
        remoteUserId ? `with ${remoteUserId}` : ""
      );
    };

    channel.onclose = () => {
      console.log(
        "Data channel is closed:",
        channel.label,
        remoteUserId ? `with ${remoteUserId}` : ""
      );
    };

    channel.onmessage = (event) => {
      if (typeof event.data !== "string") {
        console.warn("Received non-text data on chat channel", event.data);
        return;
      }

      try {
        const parsed = JSON.parse(event.data) as ChatDataEnvelope | ChatMessage;

        if ((parsed as ChatDataEnvelope)?.kind) {
          const envelope = parsed as ChatDataEnvelope;
          switch (envelope.kind) {
            case "chat-message":
              handleIncomingChatMessage(envelope.payload);
              break;
            case "file-download-request":
              handleDownloadRequest(envelope.payload);
              break;
            case "file-download-response":
              handleDownloadResponse(envelope.payload);
              break;
            case "system":
              // future system notices
              break;
          }
          return;
        }

        handleIncomingChatMessage(parsed as ChatMessage);
      } catch (error) {
        console.error("Error parsing chat payload:", error);
      }
    };
  };

  const sendChatMessage = (chatText: string) => {
    if (!chatText) {
      return false;
    }

    const trimmedMessage = chatText.trim();

    if (!trimmedMessage) {
      return false;
    }

    if (!userId || !userName) {
      toast.error("Unable to send chat", {
        description: "User identity missing. Please rejoin the room.",
      });
      return false;
    }

    const timestamp = Date.now();
    const attachments = filesToBeSent.map((entry) => ({
      id: entry.id,
      ownerId: userId,
      name: entry.file.name,
      size: entry.file.size,
      type: entry.file.type,
    }));

    const localMessage: ChatMessage = {
      id: `${userId}-${timestamp}`,
      userId,
      userName,
      message: trimmedMessage,
      timestamp,
      attachments: attachments.length ? attachments : undefined,
    };

    addChatMessage(localMessage);

    sendEnvelope({ kind: "chat-message", payload: localMessage });

    if (attachments.length) {
      clearFilesToBeSent();
    }

    return true;
  };

  const requestFileDownload = (fileId: string, ownerId: string) => {
    if (!userId) {
      toast.error("Unable to request file", {
        description: "User identity missing. Please rejoin the room.",
      });
      return false;
    }

    if (ownerId === userId) {
      toast.info("File already available", {
        description: "You already own this file.",
      });
      return false;
    }

    return sendEnvelope(
      {
        kind: "file-download-request",
        payload: {
          fileId,
          ownerId,
          requesterId: userId,
        },
      },
      ownerId
    );
  };

  const cleanUp = () => {
    try {
      Object.values(peerConnections.current).forEach((pc) => pc.close());

      console.log("leaving room:", roomId);

      socketRef.current?.send(
        JSON.stringify({
          type: "leave-room",
          roomId,
          userId,
        } as LeaveRoomMessage)
      );
      socketRef.current?.close();
      localStream.current?.getTracks().forEach((track) => track.stop());
      localStream.current = null;
      currentVideoDeviceId.current = null;
      currentAudioDeviceId.current = null;
      clearChatMessages();
      resetUnreadCount();
      resetFileStore();
      leaveRoom();
      clearMediaStreams();
      clearJoinRequests();
    } catch (error) {
      console.error("Error cleaning up WebSocket connection:", error);
    }
  };

  return {
    socketRef,
    peerConnections,
    dataChannelMap,
    status,
    isConnected,
    isRoomFull,
    localStream,
    localVideoRef,
    connectToRoom,
    createWSConnection,
    sendWsMessage,
    sendFile,
    sendChatMessage,
    requestFileDownload,
    createPeerConnection,
    createOffer,
    handleSignalingMessage,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    switchCamera,
    switchMicrophone,
    cleanUp,
    respondToJoinRequest,
  };
};
