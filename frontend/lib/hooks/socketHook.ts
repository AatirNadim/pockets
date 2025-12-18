import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "../stores/userStore";
import { serverPath, STUN_SERVERS_LIST } from "@/lib/constants";

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

export const useSocket = () => {
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const dataChannelMap = useRef<Record<string, RTCDataChannel | null>>({});

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
    // sendWsMessage({
    //   roomId,
    //   userId,
    //   type: "audio-unmute",
    // } as AudioUnmuteMessage);
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
          });
          setStatus("Host ended the room");
          console.log("cleanup being called after host closed room...");
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

    sendWsMessage(payload);
    removeJoinRequestFromStore(guestId);
  };

  const registerPCEventHandlers = (
    pc: RTCPeerConnection,
    remoteUserId: string,
    remoteUserName: string,
    remoteUserType: UserType = UserType.GUEST
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
          addRemoteUser(remoteUserId, remoteUserName, remoteUserType);
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
            urls: STUN_SERVERS_LIST,
          },
        ],
        iceCandidatePoolSize: 10,
      });

      // registering peer connection event handlers
      console.log("running pc event handler registration...");

      registerPCEventHandlers(pc, remoteUserId, remoteUserName, remoteUserType);

      peerConnections.current[remoteUserId] = pc;

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
      delete audioSendersRef.current[remoteUserId];
      delete videoSendersRef.current[remoteUserId];

      if (Object.keys(peerConnections.current).length === 0) {
        setStatus("Waiting for other users...");
      } else if (Object.keys(peerConnections.current).length === 1) {
        setIsConnected(false);
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
      console.log("received file download request:", payload);

      // check whether the file is still available locally
      const entry = getLocalFileEntry(payload.fileId);
      if (!entry) {
        console.log("requested file is no longer available locally:", payload);
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

      // send acceptance response
      console.log("fulfilling download request for file:", payload.fileId);
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

      // initiate file transfer
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

    clearDownloadProgress(payload.fileId);

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

        // check whether the parsed data is an envelope or a direct chat message
        if ((parsed as ChatDataEnvelope)?.kind) {
          const envelope = parsed as ChatDataEnvelope;

          // the parsed data is an envelope; handle based on its kind
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

        // the parsed data is a direct chat message
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

    markDownloadRequested(fileId);

    console.log("sending file download request for file:", fileId);

    const delivered = sendEnvelope(
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

    if (!delivered) {
      clearDownloadProgress(fileId);
    }

    return delivered;
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
      cleanUpMediaDevices();
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
