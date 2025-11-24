"use client";

import type React from "react";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  VideoOff,
  Users,
  Copy,
  Minimize2,
  Maximize2,
  Sparkles,
} from "lucide-react";

import { v4 as uuidV4 } from "uuid";
import { toast } from "sonner";
import ChatComponent from "@/components/custom/chatComponent";
import MediaControl from "@/components/custom/mediaControl";
import { useChatStore } from "@/lib/stores/chatStore";
import { useMediaStore } from "@/lib/hooks/mediaHook";

export default function Room() {
  const { showChat } = useChatStore();
  const { isVideoOff } = useMediaStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const localStream = useRef<MediaStream | null>(null);

  const params = useParams();
  const router = useRouter();
  const roomId = params.room as string;

  // States

  const [isMinimized, setIsMinimized] = useState(false);
  const [userId] = useState(uuidV4());

  const [participantCount, setParticipantCount] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [roomCopied, setRoomCopied] = useState(false);

  const ws = useRef<WebSocket | null>(null);
  // State to track which ICE candidates have already been processed

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
    }
  };

  useEffect(() => {
    createAndJoinRoom();

    window.addEventListener("beforeunload", removeWSConnection);

    return () => {
      window.removeEventListener("beforeunload", removeWSConnection);

      removeWSConnection();
    };
  }, [roomId, userId]);

  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setRoomCopied(true);
      setTimeout(() => setRoomCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy room ID:", err);
    }
  }, [roomId]);

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
          <ChatComponent />
        </div>
      </div>

      {/* Control Bar */}
      <MediaControl />

      {/* Room ID Display */}
      <div className="absolute top-24 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
        <div className="text-xs text-gray-400 mb-1">Room ID</div>
        <div className="font-mono text-sm text-white">{roomId}</div>
      </div>
    </div>
  );
}
