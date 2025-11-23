"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Users,
  Settings,
  Copy,
  Send,
  Minimize2,
  Maximize2,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  AnswerMessage,
  IceCandidateMessage,
  OfferMessage,
  WebSocketMessage,
} from "../../../shared/types";

import { v4 as uuidV4 } from "uuid";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

interface IceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export default function Room() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  const localStream = useRef<MediaStream | null>(null);

  const dataChannel = useRef<RTCDataChannel | null>(null);

  const params = useParams();
  const router = useRouter();
  const roomId = params.room as string;

  // States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLocalVideoExpanded, setIsLocalVideoExpanded] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [userId] = useState(uuidV4());
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});

  const [isCreating, setIsCreating] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      user: "System",
      message:
        "Welcome to the room! Share the room ID with others to invite them.",
      timestamp: new Date(),
    },
  ]);
  const [participantCount, setParticipantCount] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [roomCopied, setRoomCopied] = useState(false);

  const ws = useRef<WebSocket | null>(null);

  const serverPort = process.env.NEXT_PUBLIC_SERVER_PORT || "8080";

  const serverPath = `${
    process.env.NEXT_PUBLIC_SERVER_PATH || "localhost"
  }:${serverPort}`;

  const isCaller = useRef(false);
  // State to track which ICE candidates have already been processed
  const processedIceCandidates = useRef(new Set<string>());

  useEffect(() => {
    console.info("Current peer connections:", peerConnections.current);
  }, [peerConnections]);

  const createVideoStream = async () => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      if (localVideoRef.current) {
        console.debug("Accessing local video stream...");
        localVideoRef.current.srcObject = localStream.current;
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error(
        "Could not access camera or microphone. Please check permissions and try again."
      );
      router.push("/"); // Redirect to home on error
    }
  };

  const createAndJoinRoom = async () => {
    try {
      await Promise.all([createVideoStream(), createWSConnection()]);
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // a dedicated rtc connection will be established for each remote user
  const createRTCConnection = async (remoteUserId: string) => {
    try {
      console.debug("Creating new RTCPeerConnection...");

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

      // register peer connection event listeners

      pc.onicecandidate = (event) => {
        // this event is triggered when a new ICE candidate is created and discovered to be sent to the remote user
        if (event.candidate) {
          const candidate: RTCIceCandidateInit = event.candidate.toJSON();
          console.debug("New ICE candidate created:", candidate);

          // Send the new ICE candidate to the signaling server
          sendWsMessage({
            type: "ice-candidate",
            roomId,
            fromUserId: userId,
            toUserId: remoteUserId,
            candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        console.debug(
          "Remote track received:",
          event,
          "from user:",
          remoteUserId
        );

        // TODO: update for multiple remote streams

        if (remoteVideoRef.current && event.streams.length > 0) {
          console.debug("Remote video track received");
          remoteVideoRef.current.srcObject = event.streams[0];

          setRemoteStreams((prev) => ({
            ...prev,
            [remoteUserId]: event.streams[0],
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        console.debug(
          `Connection state with remote user ${remoteUserId} changed: ${pc.connectionState}`
        );

        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          console.warn(
            `Connection with remote user ${remoteUserId} lost. Attempting to reconnect...`
          );

          setRemoteStreams((prev) => {
            prev[remoteUserId]?.getTracks().forEach((track) => track.stop());
            delete prev[remoteUserId];
            return { ...prev };
          });
        }

        setConnectionStatus(
          pc.connectionState as "connecting" | "connected" | "disconnected"
        );
      };

      pc.ondatachannel = (eve) => {
        console.debug("Data channel created with remote user:", remoteUserId);
        dataChannel.current = eve.channel;
        // setupDataChannel();
      };

      // adding local audio and video tracks to be sent to the remote user via the established peer connection
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStream.current!);
        });
      }

      // adding new remote stream to the map of remote streams
      if (peerConnections.current) peerConnections.current[remoteUserId] = pc;
    } catch (error) {
      console.error("Error creating RTC connection:", error);
      toast.error("Failed to create RTC connection. Please try again.");
    }
  };

  const createOffer = async (remoteUserId: string) => {
    try {
      if (!peerConnections.current?.[remoteUserId]) {
        throw new Error(`No peer connection found for user ${remoteUserId}`);
      }
      const pc = peerConnections.current[remoteUserId];

      console.debug("Creating offer for remote user:", remoteUserId);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      console.debug(
        `Offer created to send to the user ${remoteUserId}:\n`,
        offer
      );

      await pc.setLocalDescription(offer);

      sendWsMessage({
        type: "offer",
        fromUserId: userId,
        toUserId: remoteUserId,
        offer,
        roomId,
      });

      console.debug("Offer created and sent to signaling server");
    } catch (error) {
      console.error("Error creating offer:", error);
      toast.error("Failed to create offer. Please try again.");
    }
  };

  const handleOffer = async (message: WebSocketMessage) => {
    try {
      const { offer, fromUserId } = message as OfferMessage;

      console.debug("Handling offer from user:", fromUserId);

      console.debug(`Offer received from userId ${fromUserId}:\n`, offer);

      // if(!peerConnections.current?.[fromUserId]) {
      //   await createRTCConnection(fromUserId);
      // }

      let pc = peerConnections.current[fromUserId];

      if (!pc) {
        await createRTCConnection(fromUserId);
        pc = peerConnections.current[fromUserId];
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(answer);

      sendWsMessage({
        type: "answer",
        fromUserId: userId,
        toUserId: fromUserId,
        answer,
        roomId,
      });
    } catch (error) {
      console.error("Error handling offer:", error);
      toast.error("Failed to handle offer. Please try again.");
    }
  };

  const handleAnswer = async (message: WebSocketMessage) => {
    try {
      const { answer, fromUserId } = message as AnswerMessage;

      console.debug("Handling answer from user:", fromUserId);

      if (!peerConnections.current?.[fromUserId]) {
        await createRTCConnection(fromUserId);
      }

      const pc = peerConnections.current[fromUserId];
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      console.info("Answer handled successfully for user:", fromUserId);
      console.info(
        "Remote description set for the remote id:",
        fromUserId,
        "for the user id:",
        userId
      );
    } catch (error) {
      console.error("Error handling answer:", error);
      toast.error("Failed to handle answer. Please try again.");
    }
  };

  const handleIceCandidate = async (message: WebSocketMessage) => {
    try {
      const { candidate, fromUserId } = message as IceCandidateMessage;

      console.debug("Handling ICE candidate from user:", fromUserId);

      if (!peerConnections.current?.[fromUserId]) {
        await createRTCConnection(fromUserId);
      }

      const pc = peerConnections.current[fromUserId];
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.debug(`Added ICE candidate for ${fromUserId}`);
      } else {
        console.warn(
          `Remote description not set for ${fromUserId}, queuing ICE candidate`
        );
        // You might want to queue candidates here
      }

      console.info("ICE candidate handled successfully for user:", fromUserId);
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
      toast.error("Failed to handle ICE candidate. Please try again.");
    }
  };

  const createWSConnection = async () => {
    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
      ws.current = new WebSocket(`${wsProtocol}://${serverPath}`);

      console.log("WebSocket connection created successfully!!");

      // register event listeners

      ws.current.onopen = (eve) => {
        console.log("WebSocket connection established --> ", eve);

        console.debug("Creating new room...");

        sendWsMessage({
          type: "join-room",
          roomId,
          userId,
          userName: `User-${userId.slice(0, 8)}`,
        });
        console.debug("new room creation message sent to signaling server");
      };

      ws.current.onmessage = async (eve) => {
        try {
          const message: WebSocketMessage = JSON.parse(eve.data);
          console.log("WebSocket message received --> ", message);

          switch (message.type) {
            case "user-joined":
              console.debug(
                `User ${message.userId} joined room: ${message.roomId}`
              );
              toast.success(
                `Joined room ${message.roomId} as ${message.userId}`
              );
              console.debug(
                "Creating rtc connection for the joined user: ",
                message.userId
              );
              await createRTCConnection(message.userId);

              console.debug("Extending offer to the new user:", message.userId);

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

            case "error":
              console.error("Error message received from server:", message);
              toast.error(`Error: ${message.message}`);
              break;

            default:
              console.warn("Unhandled message type:", message.type);
              break;
          }
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.current.onclose = () => {
        console.log("WebSocket connection closed");
      };

      console.log("Registered WebSocket event listeners successfully");
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      toast.error("Failed to connect to signaling server. Please try again.");
      return;
    }
  };

  const removeWSConnection = () => {
    if (!ws.current) return;
    sendWsMessage({
      type: "leave-room",
      roomId,
      userId,
    });
    ws.current.close();

    for (const pc in peerConnections.current) {
      peerConnections.current[pc].close();
      delete peerConnections.current[pc];
    }

    peerConnections.current = {};

    console.debug("Stopping all remote streams...");
    for (const streamId in remoteStreams) {
      remoteStreams[streamId].getTracks().forEach((track) => track.stop());
    }

    console.debug("removed all remote streams");
    setRemoteStreams({});

    console.debug("Stopping local video stream...");
    localStream.current?.getTracks().forEach((track) => track.stop());
  };

  useEffect(() => {
    createAndJoinRoom();

    window.addEventListener("beforeunload", removeWSConnection);

    return () => {
      window.removeEventListener("beforeunload", removeWSConnection);

      removeWSConnection();
    };
  }, [roomId, userId]);

  const sendWsMessage = (message: WebSocketMessage) => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(message));
      } else {
        console.error("WebSocket is not open. Cannot send message.");
      }
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOff(!isSpeakerOff);
  };

  const leaveRoom = () => {
    // all the local streams and remote connections will be cleaned up in the useEffect cleanup function
    // current room details will also be removed from the signalling server
    router.push("/");
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setRoomCopied(true);
      setTimeout(() => setRoomCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy room ID:", err);
    }
  };

  const sendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        user: "You",
        message: chatMessage.trim(),
        timestamp: new Date(),
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // return <div>stuff</div>;

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-gradient-to-r from-[#635bff] to-[#00d4ff] rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-[#635bff] to-[#00d4ff] bg-clip-text text-transparent">
                Pockets
              </h1>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-400"
                      : connectionStatus === "connecting"
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-red-400"
                  }`}
                ></div>
                <span className="capitalize">{connectionStatus}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1.5">
              <Users className="w-4 h-4 text-gray-300" />
              <span className="text-sm font-medium">{participantCount}</span>
            </div>

            <Button
              onClick={copyRoomId}
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <Copy className="w-4 h-4 mr-2" />
              {roomCopied ? "Copied!" : "Copy ID"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex pt-20">
        {/* Video Area */}
        <div
          className={`flex-1 relative transition-all duration-300 ${
            showChat ? "mr-80" : ""
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Remote Video */}
            <div className="flex-1 relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg m-4 overflow-hidden shadow-2xl">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 bg-gradient-to-r from-[#635bff] to-[#00d4ff] rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-300">
                      Waiting for others...
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Share the room ID to invite participants
                    </p>
                  </div>
                </div>
              </div>

              {/* Remote user info overlay */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="text-sm font-medium">Remote User</span>
              </div>
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div
              className={`absolute bottom-24 right-8 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg overflow-hidden shadow-xl border-2 border-white/20 transition-all duration-300 ${
                isMinimized ? "w-16 h-12" : "w-48 h-36"
              }`}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff
                    className={`text-gray-400 ${
                      isMinimized ? "w-4 h-4" : "w-8 h-8"
                    }`}
                  />
                </div>
              )}

              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                <span
                  className={`font-medium ${
                    isMinimized ? "text-[10px]" : "text-xs"
                  }`}
                >
                  You
                </span>
              </div>

              <Button
                onClick={() => setIsMinimized(!isMinimized)}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 w-6 h-6 p-0 bg-black/50 hover:bg-black/70 transition-colors"
              >
                {isMinimized ? (
                  <Maximize2 className="w-3 h-3" />
                ) : (
                  <Minimize2 className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div
          className={`bg-gray-900/95 backdrop-blur-sm border-l border-white/10 transition-all duration-300 ${
            showChat ? "w-80" : "w-0 overflow-hidden"
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </h3>
            </div>

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${
                    msg.user === "You"
                      ? "ml-4"
                      : msg.user === "System"
                      ? ""
                      : "mr-4"
                  }`}
                >
                  <div
                    className={`rounded-lg p-3 ${
                      msg.user === "You"
                        ? "bg-[#635bff] ml-auto max-w-[80%]"
                        : msg.user === "System"
                        ? "bg-gray-700 text-center text-sm"
                        : "bg-gray-700 max-w-[80%]"
                    }`}
                  >
                    {msg.user !== "System" && (
                      <div className="text-xs text-gray-300 mb-1">
                        {msg.user}
                      </div>
                    )}
                    <div className="text-sm">{msg.message}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex space-x-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500"
                />
                <Button
                  onClick={sendMessage}
                  size="sm"
                  className="bg-[#635bff] hover:bg-[#544dc9] transition-colors"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-center space-x-4 p-6">
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="lg"
            className={`w-12 h-12 rounded-full transition-all duration-200 ${
              isMuted
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
            }`}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>

          <Button
            onClick={toggleVideo}
            variant="ghost"
            size="lg"
            className={`w-12 h-12 rounded-full transition-all duration-200 ${
              isVideoOff
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
            }`}
          >
            {isVideoOff ? (
              <VideoOff className="w-5 h-5" />
            ) : (
              <Video className="w-5 h-5" />
            )}
          </Button>

          <Button
            onClick={toggleSpeaker}
            variant="ghost"
            size="lg"
            className={`w-12 h-12 rounded-full transition-all duration-200 ${
              isSpeakerOff
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
            }`}
          >
            {isSpeakerOff ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>

          <Button
            onClick={() => setShowChat(!showChat)}
            variant="ghost"
            size="lg"
            className={`w-12 h-12 rounded-full transition-all duration-200 ${
              showChat
                ? "bg-[#635bff] hover:bg-[#544dc9] text-white"
                : "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all duration-200"
          >
            <Settings className="w-5 h-5" />
          </Button>

          <div className="w-px h-8 bg-white/20 mx-2"></div>

          <Button
            onClick={leaveRoom}
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 transform hover:scale-105"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Room ID Display */}
      <div className="absolute top-24 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
        <div className="text-xs text-gray-400 mb-1">Room ID</div>
        <div className="font-mono text-sm text-white">{roomId}</div>
      </div>
    </div>
  );
}
