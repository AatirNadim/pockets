import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "../stores/userStore";
import {
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_QUEUED_FILES,
  serverPath,
  STUN_SERVERS_LIST,
} from "@/lib/constants";

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
  TrackType,
  AudioMuteMessage,
  AudioUnmuteMessage,
  ChatDataEnvelope,
  ChatMessage,
  FileDownloadRequest,
  FileDownloadResponse,
  UserType,
} from "@pockets/shared";
import { useMediaStore } from "../stores/mediaStore";
import { useFile } from "./fileHook";
import useMedia from "./mediaHook";
import { uploadSessionRegistry } from "../utils/fileManagement/uploadSessionRegistry";
import { useConnectionStore } from "../stores/connectionStore";

export const useSocket = () => {
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const intentionalSocketClose = useRef(false);
  const signalingFailureReported = useRef(false);
  const admissionRosterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReceivedRoomRoster = useRef(false);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const dataChannelMap = useRef<Record<string, RTCDataChannel | null>>({});
  const iceServers = useRef<RTCIceServer[]>([{ urls: STUN_SERVERS_LIST }]);
  const iceRestartAttempts = useRef<Record<string, number>>({});
  const peerTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingIceCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const setPeerStatus = useConnectionStore((state) => state.setPeerStatus);
  const removePeerStatus = useConnectionStore((state) => state.removePeerStatus);
  const clearPeerStatuses = useConnectionStore((state) => state.clearPeerStatuses);

  const clearPeerTimeout = (remoteUserId: string) => {
    const timeout = peerTimeouts.current[remoteUserId];
    if (timeout) clearTimeout(timeout);
    delete peerTimeouts.current[remoteUserId];
  };

  const markPeerFailed = (
    remoteUserId: string,
    userName: string,
    userType: UserType,
    issue: string,
    notify = true
  ) => {
    clearPeerTimeout(remoteUserId);
    const pc = peerConnections.current[remoteUserId];
    const previous = useConnectionStore.getState().peers[remoteUserId];
    setPeerStatus(remoteUserId, {
      userName,
      userType,
      state: pc?.connectionState ?? "failed",
      iceState: pc?.iceConnectionState ?? "failed",
      phase: "failed",
      issue,
    });
    if (notify && previous?.phase !== "failed") {
      toast.error(`Could not connect to ${userName}`, {
        id: `peer-connection-${remoteUserId}`,
        description: issue,
        duration: 8000,
      });
    }
  };

  const watchPeerConnection = (
    remoteUserId: string,
    userName: string,
    userType: UserType,
    timeoutMs = 25000,
    issue = `No connection was established with ${userName}. They may be offline or their network may block the call.`
  ) => {
    clearPeerTimeout(remoteUserId);
    peerTimeouts.current[remoteUserId] = setTimeout(() => {
      const pc = peerConnections.current[remoteUserId];
      if (pc?.connectionState === "connected" &&
        (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed")) return;
      markPeerFailed(remoteUserId, userName, userType, issue);
    }, timeoutMs);
  };

  const flushPendingIceCandidates = async (
    remoteUserId: string,
    pc: RTCPeerConnection
  ) => {
    const pending = pendingIceCandidates.current[remoteUserId] ?? [];
    delete pendingIceCandidates.current[remoteUserId];
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const reportSignalingUnavailable = () => {
    if (intentionalSocketClose.current || signalingFailureReported.current) return;
    signalingFailureReported.current = true;
    if (admissionRosterTimeout.current) clearTimeout(admissionRosterTimeout.current);
    admissionRosterTimeout.current = null;
    const peers = useConnectionStore.getState().peers;
    let connectedPeers = 0;
    for (const [remoteUserId, peer] of Object.entries(peers)) {
      const pc = peerConnections.current[remoteUserId];
      if (pc?.connectionState === "connected") {
        connectedPeers += 1;
        continue;
      }
      markPeerFailed(remoteUserId, peer.userName, peer.userType,
        "The signaling server disconnected before this call was established. Rejoin the room to try again.", false);
    }
    setIsConnected(connectedPeers > 0);
    setStatus(connectedPeers
      ? "Signaling server disconnected. Existing calls may continue; rejoin to restore room features."
      : "Signaling server disconnected. Rejoin the room to continue.");
    toast.error("Signaling connection lost", {
      description: connectedPeers
        ? "Existing media calls may continue, but new calls and room updates are unavailable. Rejoin to restore them."
        : "Peer calls could not be established. Rejoin the room when your network is available.",
      duration: 10000,
    });
  };

  const [status, setStatus] = useState("Connecting to room...");
  const [isConnected, setIsConnected] = useState(false);
  const [isRoomFull, setIsRoomFull] = useState(false);

  const {
    localStream,
    localVideoRef,
    audioSendersRef,
    videoSendersRef,
    switchCameraForPeers,
    switchMicrophoneForPeers,
    replaceLocalTrackForPeers,
    replaceTrackForPeers,
    cleanUpMediaDevices,
    createMediaStreams,
    startAudioAnalysis,
    stopAudioAnalysis,
    markAudioAsSilentForUser,
  } = useMedia();

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
    getLocalFileEntry,
    clearFilesToBeSent,
    resetFileStore,
    markDownloadRequested,
    clearDownloadProgress,
  } = useFileStore();

  const addChatMessage = useChatStore((state) => state.addChatMessage);
  const incrementUnreadCount = useChatStore(
    (state) => state.incrementUnreadCount
  );
  const resetUnreadCount = useChatStore((state) => state.resetUnreadCount);
  const clearChatMessages = useChatStore((state) => state.clearChatMessages);

  const {
    isVideoOff,
    setIsVideoOff,
    addMediaStream,
    removeMediaStream,
    clearMediaStreams,
    setRemoteTrackEnabled,
    setMicrophoneMuted,
    isMicrophoneMuted,
    removeTrackFromStream,
    clearRemoteTrackState,
  } = useMediaStore();

  const {
    addRequest: addJoinRequest,
    removeRequest: removeJoinRequestFromStore,
    clearRequests: clearJoinRequests,
  } = useJoinRequestStore();

  const { sendFile, sendFilesToUser, registerIncomingTransferChannel } =
    useFile({
      peerConnections,
      dataChannelMap,
    });

  useEffect(() => {
    if (!roomId || !userId) return;

    if (isMicrophoneMuted) {
      sendWsMessage({ roomId, userId, type: "audio-mute" } as AudioMuteMessage);
    } else {
      sendWsMessage({
        roomId,
        userId,
        type: "audio-unmute",
      } as AudioUnmuteMessage);
    }
  }, [roomId, userId, isMicrophoneMuted]);

  const switchCamera = (deviceId: string) => {
    switchCameraForPeers(deviceId, peerConnections.current);
  };

  const switchMicrophone = (deviceId: string) => {
    switchMicrophoneForPeers(deviceId, peerConnections.current);
  };

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

  const updateAudioSendStateForPeers = async (toBeMuted: boolean) => {
    console.log("updating microphone mute state to:", toBeMuted);
    if (toBeMuted === isMicrophoneMuted) {
      return;
    }

    if (toBeMuted) {
      const audioTracks = localStream.current?.getAudioTracks() ?? [];
      audioTracks.forEach((track) => {
        track.enabled = false;
      });

      await replaceTrackForPeers("audio", null, peerConnections.current);

      console.log("sending audio-mute message to the room...");
      // sendWsMessage({ roomId, userId, type: "audio-mute" } as AudioMuteMessage);

      if (userId) {
        // stopAudioAnalysis(userId);
        markAudioAsSilentForUser(userId);
      }

      setMicrophoneMuted(true);
      return;
    }

    await replaceLocalTrackForPeers("audio", peerConnections.current);

    setMicrophoneMuted(false);

    console.log("sending audio-unmute message to the room...");
  };

  const updateVideoSendStateForPeers = async (toDisable: boolean) => {
    if (toDisable === isVideoOff) {
      return;
    }
    if (toDisable) {
      const videoTracks = localStream.current?.getVideoTracks() ?? [];
      videoTracks.forEach((track) => {
        track.enabled = false;
      });

      await replaceTrackForPeers("video", null, peerConnections.current);
      setIsVideoOff(true);
    } else {
      await replaceLocalTrackForPeers("video", peerConnections.current);
      setIsVideoOff(false);
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
        console.log("setting the header status for usertype:", userType);
        setStatus(
          userType === UserType.GUEST
            ? "Waiting for host approval..."
            : "Waiting for other users..."
        );
      };

      socket.onmessage = (event) => {
        try {
          handleSignalingMessage(JSON.parse(event.data));
        } catch (error) {
          console.error("Invalid message from signaling server", error);
          setStatus("Received an invalid room update. Rejoin the room if the call does not recover.");
        }
      };

      socket.onclose = () => {
        reportSignalingUnavailable();
      };

      socket.onerror = () => {
        reportSignalingUnavailable();
      };
    } catch (error) {
      console.error("Error registering WebSocket listeners:", error);
      toast.error("Connection Error", {
        description: "Failed to connect to signaling server",
      });
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
      intentionalSocketClose.current = false;
      signalingFailureReported.current = false;
      hasReceivedRoomRoster.current = false;
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
      await Promise.all([createMediaStreams(), loadIceServers()]);
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
      case "room-roster":
        hasReceivedRoomRoster.current = true;
        if (admissionRosterTimeout.current) clearTimeout(admissionRosterTimeout.current);
        admissionRosterTimeout.current = null;
        setStatus("Participant list received. Connecting to the room…");
        for (const user of message.users) {
          if (!user?.id || user.id === userId || !user.name) continue;
          addRemoteUser(user.id, user.name, user.type);
          setPeerStatus(user.id, {
            userName: user.name,
            userType: user.type,
            state: "new",
            iceState: "new",
            phase: "waiting",
            issue: `Waiting for ${user.name} to start the call.`,
          });
          createPeerConnection(user.id, user.name, user.type);
        }
        break;

      case "user-joined":
        console.log(
          "a new user has joined the room, creating a peer connection..."
        );
        addRemoteUser(message.userId, message.userName, message.userType);
        createPeerConnection(
          message.userId,
          message.userName,
          message.userType
        );
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
        console.log("error signalling message received:", message);
        setStatus("Connection failed");
        setIsConnected(false);
        toast.error("Error", {
          description: message.message || "An error occurred",
        });
        console.log("cleanup being called after error signalling message...");
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
          hasReceivedRoomRoster.current = false;
          if (admissionRosterTimeout.current) clearTimeout(admissionRosterTimeout.current);
          admissionRosterTimeout.current = setTimeout(() => {
            if (hasReceivedRoomRoster.current) return;
            setStatus("You were admitted, but the room roster did not arrive. Rejoin to restore peer connections.");
            toast.error("Room setup did not finish", {
              description: "The host approved you, but participant details did not arrive. Rejoin the room to try again.",
              duration: 10000,
            });
          }, 10000);
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
            duration: 5000,
          });
          console.log("cleanup being called after join request rejection...");
          cleanUp();
        }
        if (userType === UserType.HOST) {
          removeJoinRequestFromStore(message.guestUserId);
        }
        break;

      case "audio-mute":
        handleRemoteUserMuted(message);
        break;

      case "audio-unmute":
        handleRemoteUserUnmuted(message);
        break;

      case "host-closed-room":
        if (userType === UserType.GUEST) {
          toast.error("Room Closed", {
            description: "The host ended this room. Returning to the lobby...",
            duration: 5000,
          });
          setStatus("Host ended the room");
          console.log("cleanup being called after host closed room...");
          cleanUp();
          router.push("/");
        }
        break;
    }
  };

  const sendWsMessage = (message: WebSocketMessage): boolean => {
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(message));
        return true;
      } else {
        console.error("WebSocket is not open. Cannot send message.");
      }
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
    }
    return false;
  };

  const restartPeerIce = async (remoteUserId: string, pc: RTCPeerConnection) => {
    if (!userId || !userName || !roomId || userId.localeCompare(remoteUserId) > 0) return;
    if ((iceRestartAttempts.current[remoteUserId] ?? 0) >= 1 || pc.signalingState !== "stable") return;
    iceRestartAttempts.current[remoteUserId] = (iceRestartAttempts.current[remoteUserId] ?? 0) + 1;
    setStatus(`Reconnecting to ${remoteUserId.slice(0, 6)}…`);
    const peer = useConnectionStore.getState().peers[remoteUserId];
    if (peer) {
      setPeerStatus(remoteUserId, {
        userName: peer.userName,
        userType: peer.userType,
        phase: "reconnecting",
        issue: "The network path failed. Trying to reconnect…",
      });
      watchPeerConnection(remoteUserId, peer.userName, peer.userType, 20000,
        `Could not restore the connection with ${peer.userName}. Check the network or TURN availability.`);
    }
    try {
      pc.restartIce();
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      if (!offer.sdp) throw new Error("Browser did not create an ICE restart offer");
      if (!sendWsMessage({
        type: "offer",
        roomId,
        fromUserId: userId,
        fromUserName: userName,
        fromUserType: userType ?? UserType.GUEST,
        toUserId: remoteUserId,
        offer: { type: "offer", sdp: offer.sdp },
      })) throw new Error("The signaling server is unavailable.");
    } catch (error) {
      console.error("ICE restart failed", error instanceof Error ? error.message : "unknown error");
      const currentPeer = useConnectionStore.getState().peers[remoteUserId];
      if (currentPeer) markPeerFailed(remoteUserId, currentPeer.userName, currentPeer.userType,
        "The connection could not be restarted because signaling is unavailable.");
    }
  };

  const loadIceServers = async () => {
    try {
      const response = await fetch("/api/ice", { cache: "no-store" });
      if (!response.ok) throw new Error("TURN configuration is unavailable");
      const result = (await response.json()) as { iceServers?: RTCIceServer[] };
      if (Array.isArray(result.iceServers)) iceServers.current = [{ urls: STUN_SERVERS_LIST }, ...result.iceServers];
    } catch (error) {
      iceServers.current = [{ urls: STUN_SERVERS_LIST }];
      console.warn("Using STUN-only ICE configuration", error instanceof Error ? error.message : "configuration unavailable");
    }
  };

  const handleRemoteUserMuted = (message: AudioMuteMessage) => {
    console.log("remote user muted, received signal for:", message.userId);
    setRemoteTrackEnabled(message.userId, TrackType.AUDIO, false);
  };

  const handleRemoteUserUnmuted = (message: AudioUnmuteMessage) => {
    console.log("remote user unmuted, received signal for:", message.userId);
    setRemoteTrackEnabled(message.userId, TrackType.AUDIO, true);
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

    if (!sendWsMessage(payload)) {
      toast.error("Could not send the host decision", {
        description: "The signaling server is unavailable. The guest request is still pending.",
      });
      return;
    }
    removeJoinRequestFromStore(guestId);
  };

  const registerPCEventHandlers = (
    pc: RTCPeerConnection,
    remoteUserId: string,
    remoteUserName: string,
    remoteUserType: UserType = UserType.GUEST
  ) => {
    setPeerStatus(remoteUserId, { userName: remoteUserName, userType: remoteUserType, state: pc.connectionState, iceState: pc.iceConnectionState, phase: "waiting" });
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.debug("Sending ICE candidate:", "to remote user:");

        if (!roomId || !userId) {
          throw new Error("Room ID or User ID is not set");
        }

        if (!sendWsMessage({
          type: "ice-candidate",
          roomId,
          fromUserId: userId,
          toUserId: remoteUserId,
          candidate: event.candidate,
        })) {
          markPeerFailed(remoteUserId, remoteUserName, remoteUserType,
            "The signaling server disconnected while sending network connection details.");
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const phase = pc.connectionState === "connected"
        ? "connected"
        : pc.connectionState === "failed" || pc.connectionState === "disconnected"
          ? "reconnecting"
          : "connecting";
      const issue = pc.connectionState === "disconnected"
        ? "Connection interrupted. Trying to restore the network path…"
        : pc.connectionState === "failed"
          ? "The network path failed. Trying one recovery attempt…"
          : undefined;
      setPeerStatus(remoteUserId, { userName: remoteUserName, userType: remoteUserType, state: pc.connectionState, iceState: pc.iceConnectionState, phase, issue });
      switch (pc.connectionState) {
        case "connected":
          clearPeerTimeout(remoteUserId);
          delete iceRestartAttempts.current[remoteUserId];
          addRemoteUser(remoteUserId, remoteUserName, remoteUserType);
          setIsConnected(true);
          setStatus("Connected to peer(s)...");
          if (remoteUsers[remoteUserId]) return;
          console.debug(
            `Connection established with remote user ${remoteUserId}`
          );
          console.log(
            "adding remote user to store...",
            remoteUserId,
            remoteUserName
          );
          toast.success("New User Joined", {
            description: `A new user, ${remoteUserName}, with ID ${remoteUserId} joined the room.`,
          });
          break;
        case "disconnected":
          console.warn(
            `Connection with remote user ${remoteUserId} disconnected. Reconnecting...`
          );

          setStatus(`Reconnecting to ${remoteUserName}…`);
          watchPeerConnection(remoteUserId, remoteUserName, remoteUserType, 15000,
            `The connection to ${remoteUserName} stayed interrupted. Check whether they are still online.`);
          break;
        case "failed":
          console.warn(
            `Connection with remote user ${remoteUserId} lost. Attempting to reconnect...`
          );

          watchPeerConnection(remoteUserId, remoteUserName, remoteUserType, 20000,
            `Could not restore the connection to ${remoteUserName}. Check the network or TURN availability.`);
          void restartPeerIce(remoteUserId, pc);
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
      const prior = useConnectionStore.getState().peers[remoteUserId];
      const iceInterrupted = pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed";
      setPeerStatus(remoteUserId, {
        userName: remoteUserName,
        userType: remoteUserType,
        state: pc.connectionState,
        iceState: pc.iceConnectionState,
        phase: iceInterrupted
          ? "reconnecting"
          : pc.connectionState === "connected" ? "connected" : prior?.phase ?? "connecting",
        issue: iceInterrupted
          ? `The network path to ${remoteUserName} was interrupted. Trying to restore it…`
          : pc.connectionState === "connected" ? undefined : prior?.issue,
      });
      console.debug(
        `ICE connection state with ${remoteUserId}: ${pc.iceConnectionState}`
      );

      switch (pc.iceConnectionState) {
        case "disconnected":
          watchPeerConnection(remoteUserId, remoteUserName, remoteUserType, 15000,
            `The network path to ${remoteUserName} stayed interrupted.`);
          break;
        case "failed":
          console.warn("ICE connection failed, attempting one restart");
          void restartPeerIce(remoteUserId, pc);
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
      console.log("received remote track from user:", remoteUserId);
      const track = event.track;
      const trackType =
        track.kind === "audio" ? TrackType.AUDIO : TrackType.VIDEO;

      addMediaStream(remoteUserId, track, trackType);

      const setState = (enabled: boolean) =>
        setRemoteTrackEnabled(remoteUserId, trackType, enabled);

      setState(!track.muted && track.readyState === "live");

      const handleMute = () => {
        console.log("remote track ", track, "muted for user:", remoteUserId);
        setState(false);
        if (trackType === TrackType.AUDIO) {
          markAudioAsSilentForUser(remoteUserId);
        }
      };

      const handleUnmute = () => {
        console.log("remote track ", track, "unmuted for user:", remoteUserId);
        setState(true);
      };

      const detachTrackListeners = () => {
        track.removeEventListener("mute", handleMute);
        track.removeEventListener("unmute", handleUnmute);
        track.removeEventListener("ended", handleEnded);
      };

      const handleEnded = () => {
        handleMute();
        detachTrackListeners();
        removeTrackFromStream(remoteUserId, trackType);
        if (trackType === TrackType.AUDIO) {
          stopAudioAnalysis(remoteUserId);
        }
      };

      if (trackType === TrackType.AUDIO) {
        console.log(
          "starting audio level analysis for remote peer track received from:",
          remoteUserId
        );
        startAudioAnalysis(remoteUserId, track);
      }

      track.addEventListener("mute", handleMute);
      track.addEventListener("unmute", handleUnmute);
      track.addEventListener("ended", handleEnded);
    };
  };

  const createPeerConnection = (
    remoteUserId: string,
    remoteUserName: string,
    remoteUserType: UserType = UserType.GUEST
  ): RTCPeerConnection | undefined => {
    try {
      const existing = peerConnections.current[remoteUserId];
      if (existing) return existing;

      console.debug(
        "Creating new RTCPeerConnection with remote user ID:",
        remoteUserId,
        remoteUserName
      );

      if (!userId || !userName) {
        throw new Error("User not initialized");
      }

      const pc = new RTCPeerConnection({
        iceServers: iceServers.current,
        iceCandidatePoolSize: 10,
      });
      addRemoteUser(remoteUserId, remoteUserName, remoteUserType);
      setPeerStatus(remoteUserId, {
        userName: remoteUserName,
        userType: remoteUserType,
        state: pc.connectionState,
        iceState: pc.iceConnectionState,
        phase: "waiting",
        issue: `Waiting for ${remoteUserName} to respond.`,
      });

      // registering peer connection event handlers
      console.log("running pc event handler registration...");

      registerPCEventHandlers(pc, remoteUserId, remoteUserName, remoteUserType);

      peerConnections.current[remoteUserId] = pc;
      watchPeerConnection(remoteUserId, remoteUserName, remoteUserType);

      console.log(
        "adding local tracks to peer connection... with local stream:",
        localStream.current
      );
      if (localStream.current) {
        console.log("local stream available, adding tracks to pc...");

        localStream.current.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, localStream.current as MediaStream);

          if (track.kind === "audio") {
            audioSendersRef.current[remoteUserId] = sender;

            if (isMicrophoneMuted) {
              void sender.replaceTrack(null).catch((error) => {
                console.error("Failed to sync mute state for new peer", error);
              });
            }
            console.log(
              "added audio track sender for user:",
              remoteUserId,
              audioSendersRef.current
            );
          } else if (track.kind === "video") {
            videoSendersRef.current[remoteUserId] = sender;
            console.log(
              "added video track sender for user:",
              remoteUserId,
              videoSendersRef.current
            );
          }
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
      return pc;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      markPeerFailed(remoteUserId, remoteUserName, remoteUserType,
        "This browser could not create a peer connection.");
      return undefined;
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
      const peer = useConnectionStore.getState().peers[remoteUserId];
      if (peer) {
        setPeerStatus(remoteUserId, {
          userName: peer.userName,
          userType: peer.userType,
          phase: "signaling",
          issue: `Sending a connection offer to ${peer.userName}…`,
        });
        watchPeerConnection(remoteUserId, peer.userName, peer.userType, 25000,
          `No response from ${peer.userName}. They may be offline or their network may block the call.`);
      }

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

      if (!sendWsMessage({
        type: "offer",
        fromUserId: userId,
        fromUserName: userName,
        fromUserType: userType,
        toUserId: remoteUserId,
        // @ts-expect-error TS2322
        offer,
        roomId,
      })) throw new Error("Signaling server is unavailable");
      console.debug("Offer sent to remote user:", remoteUserId);
    } catch (error) {
      console.error("Error creating offer:", error);
      const peer = useConnectionStore.getState().peers[remoteUserId];
      if (peer) markPeerFailed(remoteUserId, peer.userName, peer.userType,
        error instanceof Error && error.message.includes("Signaling")
          ? "The signaling server could not deliver the connection offer. Rejoin the room and try again."
          : "This browser could not create a connection offer.");
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
        createPeerConnection(
          msg.fromUserId,
          msg.fromUserName,
          msg.fromUserType
        );
        pc = peerConnections.current[fromUserId];
        console.log("Created new peer connection for user:", fromUserId);
      }

      console.log("Handling offer from remote user:", fromUserId);
      console.log("Received offer:", offer);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const peer = useConnectionStore.getState().peers[fromUserId];
      if (peer) {
        setPeerStatus(fromUserId, {
          userName: peer.userName,
          userType: peer.userType,
          phase: "connecting",
          issue: "Offer received. Negotiating the media connection…",
        });
        watchPeerConnection(fromUserId, peer.userName, peer.userType, 25000,
          `The call setup with ${peer.userName} timed out. Check the network or TURN availability.`);
      }
      await flushPendingIceCandidates(fromUserId, pc);

      console.log("Remote description set with offer:", offer);

      if (!roomId) {
        throw new Error("Room ID is not set");
      }

      // Create an answer to send back
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("Created answer:", answer);

      if (!sendWsMessage({
        type: "answer",
        roomId,
        fromUserId: userId,
        fromUserName: userName,
        fromUserType: userType,
        toUserId: fromUserId,
        // @ts-expect-error TS2322
        answer,
      })) throw new Error("Signaling server is unavailable");
    } catch (error) {
      console.error("Error handling offer:", error);
      const peer = useConnectionStore.getState().peers[msg.fromUserId];
      if (peer) markPeerFailed(msg.fromUserId, peer.userName, peer.userType,
        "This browser could not complete the connection offer. Rejoin the room to try again.");
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
      const peer = useConnectionStore.getState().peers[msg.fromUserId];
      if (peer) {
        setPeerStatus(msg.fromUserId, {
          userName: peer.userName,
          userType: peer.userType,
          phase: "connecting",
          issue: "Answer received. Checking available network routes…",
        });
        watchPeerConnection(msg.fromUserId, peer.userName, peer.userType, 25000,
          `The network could not establish a media path to ${peer.userName}. Check the network or TURN availability.`);
      }
      await flushPendingIceCandidates(msg.fromUserId, pc);

      console.debug("Remote description set with answer:", msg.answer);
    } catch (error) {
      console.error("Error handling answer:", error);
      const peer = useConnectionStore.getState().peers[msg.fromUserId];
      if (peer) markPeerFailed(msg.fromUserId, peer.userName, peer.userType,
        "The connection answer could not be applied. Rejoin the room to try again.");
    }
  };

  const handleIceCandidate = async (msg: IceCandidateMessage) => {
    try {
      const pc = peerConnections.current[msg.fromUserId];
      if (!pc || !pc.remoteDescription) {
        const queued = pendingIceCandidates.current[msg.fromUserId] ?? [];
        if (queued.length >= 128) {
          throw new Error("Too many ICE candidates arrived before negotiation");
        }
        queued.push(msg.candidate);
        pendingIceCandidates.current[msg.fromUserId] = queued;
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));

      console.debug("ICE candidate added to peer connection");
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
      const peer = useConnectionStore.getState().peers[msg.fromUserId];
      if (peer) markPeerFailed(msg.fromUserId, peer.userName, peer.userType,
        "A network route from this participant could not be applied. Rejoin the room to retry.");
    }
  };

  const handleRemoteUserLeft = (remoteUserId: string) => {
    console.log(
      "recieved an event that remote user left the room:",
      remoteUserId
    );
    try {
      clearPeerTimeout(remoteUserId);
      delete pendingIceCandidates.current[remoteUserId];
      delete iceRestartAttempts.current[remoteUserId];
      removePeerStatus(remoteUserId);
      // Cancel any active upload sessions for this peer
      uploadSessionRegistry.cancelSessionsForPeer(remoteUserId);

      peerConnections.current[remoteUserId]?.close();
      delete peerConnections.current[remoteUserId];
      delete dataChannelMap.current[remoteUserId];
      delete audioSendersRef.current[remoteUserId];
      delete videoSendersRef.current[remoteUserId];

      const anotherPeerConnected = Object.values(peerConnections.current).some(
        (connection) => connection.connectionState === "connected"
      );
      setIsConnected(anotherPeerConnected);
      if (!anotherPeerConnected && Object.keys(peerConnections.current).length === 0) {
        setStatus("Waiting for other users...");
      }

      removeRemoteUser(remoteUserId);
      removeMediaStream(remoteUserId);
      clearRemoteTrackState(remoteUserId);
      stopAudioAnalysis(remoteUserId);
      // if there is only a single peer connection left and its connectivity is failed,
      // set isConnected to false
    } catch (error) {
      console.error("Error handling remote user left:", error);
      toast.error("Error handling Remote User Left", {
        description: `Failed to handle remote user ${remoteUserId} leaving the room.: ${error}`,
      });
    }
  };

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  const isValidChatMessage = (value: unknown, senderId: string): value is ChatMessage => {
    if (!isRecord(value)) return false;
    const { id, userId: messageUserId, userName: messageUserName, message, timestamp, attachments } = value;
    if (
      typeof id !== "string" || id.length > 128 ||
      messageUserId !== senderId ||
      typeof messageUserName !== "string" || messageUserName.length > 80 ||
      typeof message !== "string" || message.length > MAX_CHAT_MESSAGE_LENGTH ||
      typeof timestamp !== "number" || !Number.isFinite(timestamp)
    ) return false;
    if (attachments === undefined) return true;
    return Array.isArray(attachments) && attachments.length <= MAX_QUEUED_FILES &&
      attachments.every((item) => isRecord(item) &&
        typeof item.id === "string" && item.id.length <= 128 &&
        item.ownerId === senderId &&
        typeof item.name === "string" && item.name.length > 0 && item.name.length <= 255 &&
        typeof item.type === "string" && item.type.length <= 128 &&
        typeof item.size === "number" && Number.isSafeInteger(item.size) && item.size >= 0 && item.size <= 50 * 1024 * 1024);
  };

  const isValidFileRequest = (value: unknown, senderId: string): value is FileDownloadRequest =>
    isRecord(value) && value.requesterId === senderId &&
    typeof value.ownerId === "string" && value.ownerId.length <= 128 &&
    Array.isArray(value.fileIds) && value.fileIds.length > 0 && value.fileIds.length <= MAX_QUEUED_FILES &&
    value.fileIds.every((id) => typeof id === "string" && id.length <= 128);

  const handleIncomingChatMessage = (incoming: ChatMessage, senderId: string) => {
    if (!isValidChatMessage(incoming, senderId)) return;
    addChatMessage(incoming);

    const isLocalMessage = incoming.userId === userId;
    const { showChat } = useChatStore.getState();

    if (!isLocalMessage && !showChat) {
      incrementUnreadCount();
    }
  };

  const handleDownloadRequest = async (payload: FileDownloadRequest, senderId: string) => {
    if (!userId || payload.ownerId !== userId || payload.requesterId !== senderId) {
      return;
    }

    try {
      console.log("received file download request:", payload);

      // check whether the file is still available locally
      const entries = payload.fileIds.map(getLocalFileEntry).filter(Boolean);
      if (entries.length === 0) {
        console.log(
          "requested files are no longer available locally:",
          payload
        );
        sendEnvelope(
          {
            kind: "file-download-response",
            payload: {
              ...payload,
              status: "unavailable",
              reason: "File is no longer available.",
            },
          },
          senderId
        );
        return;
      }

      // send acceptance response
      console.log("fulfilling download request for files:", payload.fileIds);
      sendEnvelope(
        {
          kind: "file-download-response",
          payload: {
            ...payload,
            status:
              payload.fileIds.length === entries.length
                ? "accepted(all)"
                : "accepted(partial)",
          },
        },
        senderId
      );

      // initiate file transfer
      console.log("sending file to requester:", payload.requesterId);
      await sendFilesToUser(senderId, payload.fileIds);
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
        senderId
      );
    }
  };

  const handleDownloadResponse = (payload: FileDownloadResponse, senderId: string) => {
    if (!userId || payload.requesterId !== userId || payload.ownerId !== senderId ||
      !Array.isArray(payload.fileIds) || payload.fileIds.length > MAX_QUEUED_FILES) {
      return;
    }

    if (payload.status === "accepted(all)") {
      toast.info("Download approved", {
        description: "Peer accepted your request. Transfer will start shortly.",
      });
      return;
    }
    if (payload.status === "accepted(partial)") {
      toast.info("Partial Download approved", {
        description:
          "Peer accepted your request for some files. Transfer will start shortly.",
      });
      return;
    }

    clearDownloadProgress(payload.fileIds);

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
        const parsed: unknown = JSON.parse(event.data);

        // check whether the parsed data is an envelope or a direct chat message
        if (isRecord(parsed) && typeof parsed.kind === "string" && isRecord(parsed.payload)) {
          const envelope = parsed as unknown as ChatDataEnvelope;

          // the parsed data is an envelope; handle based on its kind
          switch (envelope.kind) {
            case "chat-message":
              handleIncomingChatMessage(envelope.payload, remoteUserId ?? "");
              break;
            case "file-download-request":
              if (remoteUserId && isValidFileRequest(envelope.payload, remoteUserId)) {
                handleDownloadRequest(envelope.payload, remoteUserId);
              }
              break;
            case "file-download-response":
              if (remoteUserId && isRecord(envelope.payload) &&
                envelope.payload.ownerId === remoteUserId && envelope.payload.requesterId === userId &&
                Array.isArray(envelope.payload.fileIds) && envelope.payload.fileIds.length <= MAX_QUEUED_FILES &&
                envelope.payload.fileIds.every((id) => typeof id === "string" && id.length <= 128) &&
                ["accepted(all)", "accepted(partial)", "rejected", "unavailable"].includes(String(envelope.payload.status))) {
                handleDownloadResponse(envelope.payload, remoteUserId);
              }
              break;
            case "system":
              // future system notices
              break;
          }
          return;
        }

        // the parsed data is a direct chat message
        handleIncomingChatMessage(parsed as ChatMessage, remoteUserId ?? "");
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
    if (trimmedMessage.length > MAX_CHAT_MESSAGE_LENGTH) {
      toast.error("Message is too long", {
        description: `Keep messages under ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
      });
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

    if (!sendEnvelope({ kind: "chat-message", payload: localMessage })) return false;
    addChatMessage(localMessage);

    if (attachments.length) {
      clearFilesToBeSent();
    }

    return true;
  };

  const requestFileDownload = (fileIds: string[], ownerId: string) => {
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

    if (!fileIds.length || fileIds.length > MAX_QUEUED_FILES ||
      fileIds.some((id) => typeof id !== "string" || id.length > 128)) return false;

    markDownloadRequested(fileIds);

    console.log("sending file download request for file:", fileIds);

    const delivered = sendEnvelope(
      {
        kind: "file-download-request",
        payload: {
          fileIds,
          ownerId,
          requesterId: userId,
        },
      },
      ownerId
    );

    if (!delivered) {
      clearDownloadProgress(fileIds);
    }

    return delivered;
  };

  const cleanUp = () => {
    try {
      intentionalSocketClose.current = true;
      if (admissionRosterTimeout.current) clearTimeout(admissionRosterTimeout.current);
      admissionRosterTimeout.current = null;
      Object.keys(peerTimeouts.current).forEach(clearPeerTimeout);
      pendingIceCandidates.current = {};
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
      cleanUpMediaDevices();
      clearChatMessages();
      resetUnreadCount();
      resetFileStore();
      leaveRoom();
      clearMediaStreams();
      clearJoinRequests();
      clearPeerStatuses();
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
    switchCamera,
    switchMicrophone,
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
    cleanUp,
    respondToJoinRequest,
    updateVideoSendStateForPeers,
    updateAudioSendStateForPeers,
  };
};
