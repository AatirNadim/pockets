"use client";

import type React from "react";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Users, Copy, Sparkles } from "lucide-react";

import ChatComponent from "@/components/custom/chatComponent";
import MediaControl from "@/components/custom/mediaControl";
import { useChatStore } from "@/lib/stores/chatStore";
import { useMediaStore } from "@/lib/stores/mediaStore";
import { useVoiceActivityStore } from "@/lib/stores/voiceActivityStore";
import { ThemeToggle } from "@/components/custom/themeToggle";
import { useSocket } from "@/lib/hooks/socketHook";
import { useUserStore } from "@/lib/stores/userStore";
import { useJoinRequestStore } from "@/lib/stores/joinRequestStore";
import { UserType } from "@/lib/constants";
import { cn, isValidUUID } from "@/lib/utils";
import RemoteVideoTile from "@/components/custom/remoteVideoTile";
import LocalVideoTile from "@/components/custom/localVideoTile";
import JoinRequestList from "@/components/custom/joinRequestList";

export default function Room() {
  const { showChat } = useChatStore();
  const {
    mediaStreams,
    availableCameras,
    availableMicrophones,
    selectedCameraId,
    selectedMicrophoneId,
    remoteTrackState,
  } = useMediaStore();
  const { remoteUsers, userType, userId } = useUserStore();
  const { levels: voiceLevels } = useVoiceActivityStore();

  const router = useRouter();
  const params = useParams();
  const roomId = params.room as string;

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
    sendChatMessage,
    requestFileDownload,
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

  const localVoiceLevel = userId ? voiceLevels[userId] ?? 0 : 0;
  const isSpeakingLocally = localVoiceLevel > 0.18;

  const cleanUpRef = useRef(cleanUp);

  useEffect(() => {
    if (!isValidUUID(roomId)) {
      alert("Invalid Room ID. Redirecting to home page.");
      router.push("/");
    }
    if (!userId) {
      alert("User not initialized. Redirecting to home page.");
      router.push("/");
    }
  }, [router]);

  // cleanupref will always have latest cleanUp function
  useEffect(() => {
    cleanUpRef.current = cleanUp;
  }, [cleanUp]);

  useEffect(() => {
    connectToRoom();
  }, []);

  useEffect(() => {
    // prevent accidental back navigation without warning
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      const shouldLeave = window.confirm(
        "Leaving the room will end your session. Do you want to proceed?"
      );

      if (shouldLeave) {
        window.removeEventListener("popstate", handlePopState);
        cleanUpRef.current();
        router.back();
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  useEffect(() => {
    // 1. Handler to prompt the user before reloading/closing
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log("Before unload event triggered, cleaning up...");

      e.preventDefault();
      // Setting returnValue triggers the browser's native confirmation dialog
      e.returnValue = "";
    };

    // 2. Handler to run cleanup ONLY when the page is actually unloading
    const handlePageHide = () => {
      console.log("cleanup being called on pagehide...");
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
    <div className="relative flex h-screen max-h-screen w-screen flex-col bg-gradient-to-br from-white via-indigo-50 to-purple-100 text-slate-900 dark:from-gray-900 dark:via-gray-900 dark:to-black dark:text-white">
      {/* Header */}
      <div className="z-20 bg-white/80 dark:bg-black/20 backdrop-blur-md border-b border-slate-200 dark:border-white/10 shadow-sm h-20">
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
      <div className="w-full flex flex-col sm:flex-row h-[calc(100vh-5rem)] ">
        {/* Video Area */}
        <div
          className={cn(
            "relative transition-all duration-300 w-full",
            "flex-1 flex flex-col-reverse"
            // "flex-1"
            // showChat ? "sm:mr-80" : ""
          )}
        >
          <MediaControl
            cameras={availableCameras}
            microphones={availableMicrophones}
            selectedCameraId={selectedCameraId}
            selectedMicrophoneId={selectedMicrophoneId}
            onCameraChange={switchCamera}
            onMicrophoneChange={switchMicrophone}
            onLeave={() => {
              console.log("cleanup being called on leave...");
              cleanUpRef.current();
              router.push("/");
            }}
          />
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
                  {remoteStreamEntries.map(([remoteId, stream]) => {
                    const remoteMeta = remoteUsers[remoteId];
                    return (
                      <RemoteVideoTile
                        key={remoteId}
                        stream={stream}
                        userId={remoteId}
                        userName={remoteMeta?.name}
                        isHost={remoteMeta?.userType === UserType.HOST}
                        videoEnabled={
                          remoteTrackState[remoteId]?.videoEnabled !== false
                        }
                        audioEnabled={
                          remoteTrackState[remoteId]?.audioEnabled !== false
                        }
                        voiceLevel={voiceLevels[remoteId] ?? 0}
                      />
                    );
                  })}
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

          <LocalVideoTile localVideoRef={localVideoRef} />
        </div>
        {/* Chat Sidebar */}
        <div
          className={cn(
            !showChat && "hidden",
            "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-slate-200 dark:border-white/10 transition-all duration-300 sm:border-l sm:border-t-0 sm:border-b-0 sm:border-r-0",
            "rounded-2xl sm:rounded-none shadow-xl sm:shadow-none mt-4 sm:mt-0 w-full max-h-full sm:max-h-none overflow-hidden sm:overflow-auto sm:w-80 opacity-100 pointer-events-auto"
          )}
        >
          <ChatComponent
            onSendMessage={sendChatMessage}
            onRequestFile={requestFileDownload}
          />
        </div>
      </div>

      {/* Control Bar */}

      {isHost && requests.length > 0 && (
        <div className="fixed right-6 bottom-40 z-40 flex w-80 flex-col gap-3">
          <JoinRequestList respondToJoinRequest={respondToJoinRequest} />
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
