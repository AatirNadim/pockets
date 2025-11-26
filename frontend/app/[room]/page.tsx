"use client";

import type React from "react";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
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
import ChatComponent from "@/components/custom/chatComponent";
import MediaControl from "@/components/custom/mediaControl";
import { useChatStore } from "@/lib/stores/chatStore";
import { useMediaStore } from "@/lib/hooks/mediaHook";
import { ThemeToggle } from "@/components/custom/themeToggle";
import { useSocket } from "@/lib/hooks/socketHook";
import { useUserStore } from "@/lib/stores/userStore";
import { useJoinRequestStore } from "@/lib/stores/joinRequestStore";
import { UserType } from "@/lib/constants";

type RemoteVideoTileProps = {
  stream: MediaStream;
  userName?: string;
  userId: string;
};

const RemoteVideoTile = ({
  stream,
  userName,
  userId,
}: RemoteVideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200/60 bg-black/60 shadow-xl dark:border-white/10">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-3 left-3 bg-black/70 text-white text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm">
        {userName || `Participant ${userId.slice(0, 4)}`}
      </div>
    </div>
  );
};

export default function Room() {
  const { showChat } = useChatStore();
  const {
    isVideoOff,
    mediaStreams,
    availableCameras,
    availableMicrophones,
    selectedCameraId,
    selectedMicrophoneId,
  } = useMediaStore();
  const { remoteUsers, userType } = useUserStore();

  const params = useParams();
  const roomId = params.room as string;

  const [isMinimized, setIsMinimized] = useState(false);
  const [userId] = useState(uuidV4());
  const {
    localVideoRef,
    connectToRoom,
    cleanUp,
    status,
    isConnected,
    isRoomFull,
    switchCamera,
    switchMicrophone,
    respondToJoinRequest,
  } = useSocket();
  const { requests } = useJoinRequestStore();
  const isHost = userType === UserType.HOST;
  const [roomCopied, setRoomCopied] = useState(false);

  const remoteStreamEntries = Object.entries(mediaStreams);
  const connectionIndicatorClass = isConnected
    ? "bg-green-400"
    : isRoomFull
    ? "bg-red-400"
    : "bg-yellow-400 animate-pulse";

  const cleanUpRef = useRef(cleanUp);
  // cleanupref will always have latest cleanUp function
  useEffect(() => {
    cleanUpRef.current = cleanUp;
  }, [cleanUp]);

  useEffect(() => {
    connectToRoom();
  }, [connectToRoom, roomId, userId]);

  useEffect(() => {
    // 1. Handler to prompt the user before reloading/closing
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Setting returnValue triggers the browser's native confirmation dialog
      e.returnValue = "";
    };

    // 2. Handler to run cleanup ONLY when the page is actually unloading
    const handlePageHide = () => {
      cleanUpRef.current();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);

      // 3. Run cleanup on component unmount (SPA navigation)
      cleanUpRef.current();
    };
  }, []);

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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-white via-indigo-50 to-purple-100 text-slate-900 dark:from-gray-900 dark:via-gray-900 dark:to-black dark:text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white/80 dark:bg-black/20 backdrop-blur-md border-b border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-gradient-to-r from-[#635bff] to-[#00d4ff] rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-[#635bff] to-[#00d4ff] bg-clip-text text-transparent">
                Pockets
              </h1>
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-gray-400">
                <div
                  className={`w-2 h-2 rounded-full ${connectionIndicatorClass}`}
                ></div>
                <span className="capitalize">{status}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white text-slate-700 rounded-lg px-3 py-1.5 border border-slate-200 shadow-sm dark:bg-white/10 dark:border-white/10 dark:text-gray-300">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">
                {Object.keys(remoteUsers).length + 1}
              </span>
            </div>

            <ThemeToggle />

            <Button
              onClick={copyRoomId}
              variant="ghost"
              size="sm"
              className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-all duration-200"
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
            {/* Remote Video Grid */}
            <div className="flex-1 relative bg-white rounded-lg m-4 overflow-hidden shadow-2xl border border-slate-200 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-white/10">
              {remoteStreamEntries.length ? (
                <div className="absolute inset-0 p-4 overflow-auto">
                  <div
                    className={`grid h-full gap-4 ${
                      remoteStreamEntries.length === 1
                        ? "grid-cols-1"
                        : "grid-cols-1 md:grid-cols-2"
                    }`}
                  >
                    {remoteStreamEntries.map(([remoteId, stream]) => (
                      <RemoteVideoTile
                        key={remoteId}
                        stream={stream}
                        userId={remoteId}
                        userName={remoteUsers[remoteId]}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-gradient-to-r from-[#635bff] to-[#00d4ff] rounded-full flex items-center justify-center mx-auto">
                      <Users className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-700 dark:text-gray-300">
                        Waiting for others...
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-gray-500 mt-1">
                        Share the room ID to invite participants
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div
              className={`absolute bottom-24 right-8 bg-white rounded-lg overflow-hidden shadow-xl border-2 border-white/70 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 dark:border-white/20 transition-all duration-300 ${
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
                <div className="absolute inset-0 bg-slate-200 dark:bg-gray-800 flex items-center justify-center">
                  <VideoOff
                    className={`text-slate-500 dark:text-gray-400 ${
                      isMinimized ? "w-4 h-4" : "w-8 h-8"
                    }`}
                  />
                </div>
              )}

              <div className="absolute top-2 left-2 bg-white/80 text-slate-800 dark:bg-black/50 dark:text-white backdrop-blur-sm rounded px-2 py-1">
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
                className="absolute top-2 right-2 w-6 h-6 p-0 bg-white/70 text-slate-700 hover:bg-white/90 dark:bg-black/50 dark:hover:bg-black/70 dark:text-white transition-colors"
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
          className={`bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-l border-slate-200 dark:border-white/10 transition-all duration-300 ${
            showChat ? "w-80" : "w-0 overflow-hidden"
          }`}
        >
          <ChatComponent />
        </div>
      </div>

      {/* Control Bar */}
      <MediaControl
        cameras={availableCameras}
        microphones={availableMicrophones}
        selectedCameraId={selectedCameraId}
        selectedMicrophoneId={selectedMicrophoneId}
        onCameraChange={switchCamera}
        onMicrophoneChange={switchMicrophone}
        onLeave={cleanUp}
      />

      {isHost && requests.length > 0 && (
        <div className="fixed right-6 bottom-40 z-40 flex w-80 flex-col gap-3">
          {requests.map((request) => (
            <div
              key={request.guestId}
              className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-white/10 dark:bg-gray-900/90"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {request.guestName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    wants to join this room
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-gray-300">
                  Guest
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-[#635bff] text-white hover:bg-[#4f48ca]"
                  onClick={() =>
                    respondToJoinRequest(request.guestId, "accept")
                  }
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
                  onClick={() =>
                    respondToJoinRequest(request.guestId, "reject")
                  }
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Room ID Display */}
      <div className="absolute top-24 left-4 bg-white/90 text-slate-800 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-200 shadow dark:bg-black/50 dark:text-white dark:border-white/10">
        <div className="text-xs text-slate-500 dark:text-gray-300 mb-1">
          Room ID
        </div>
        <div className="font-mono text-sm">{roomId}</div>
      </div>
    </div>
  );
}
