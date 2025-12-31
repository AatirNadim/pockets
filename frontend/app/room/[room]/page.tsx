"use client";

import type React from "react";

import { useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

import { useMediaStore } from "@/lib/stores/mediaStore";
import { useSocket } from "@/lib/hooks/socketHook";
import { useUserStore } from "@/lib/stores/userStore";
import { useJoinRequestStore } from "@/lib/stores/joinRequestStore";
import { UserType } from "@/lib/constants";
import { cn, isValidUUID } from "@/lib/utils";
import dynamic from "next/dynamic";

const Header = dynamic(() => import("./header"), { ssr: false });

const MediaControl = dynamic(() => import("@/components/custom/mediaControl"), {
  ssr: false,
});

const LocalVideoTile = dynamic(
  () => import("@/components/custom/localVideoTile"),
  { ssr: false }
);

const RemoteVideoGrid = dynamic(() => import("./remoteVideoGrid"), {
  ssr: false,
});

const ChatSidebar = dynamic(
  () => import("@/components/custom/chat/chatSidebar"),
  { ssr: false }
);

const JoinRequestList = dynamic(
  () => import("@/components/custom/joinRequestList"),
  { ssr: false }
);

const RoomIdDisplay = dynamic(
  () => import("@/components/custom/roomIdDisplay"),
  { ssr: false }
);

export default function Room() {
  const {
    availableCameras,
    availableMicrophones,
    selectedCameraId,
    selectedMicrophoneId,
  } = useMediaStore();
  const { userType, userId } = useUserStore();

  const router = useRouter();
  const params = useParams();
  const roomId = params.room as string;

  const {
    status,
    isConnected,
    isRoomFull,
    localVideoRef,
    connectToRoom,
    cleanUp,
    switchCamera,
    switchMicrophone,
    updateAudioSendStateForPeers,
    updateVideoSendStateForPeers,
    respondToJoinRequest,
    sendChatMessage,
    requestFileDownload,
  } = useSocket();
  const { requests } = useJoinRequestStore();
  const isHost = userType === UserType.HOST;

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

  const handlePopState = useCallback(
    (event: PopStateEvent) => {
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
    },
    [router]
  );

  useEffect(() => {
    // prevent accidental back navigation without warning

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

  const onLeave = useCallback(() => {
    console.log("cleanup being called on leave...");
    cleanUpRef.current();
    router.push("/");
  }, [router]);

  return (
    <div className="relative flex h-dvh sm:h-screen w-screen flex-col overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      {/* Subtle ambient gradient */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-amber-50/30 via-transparent to-rose-50/20 dark:from-amber-900/10 dark:via-transparent dark:to-rose-900/5" />

      {/* Header */}
      <Header
        roomId={roomId}
        status={status}
        isConnected={isConnected}
        isRoomFull={isRoomFull}
      />

      {/* Main Content */}
      <div className="w-full flex-1 min-h-0 flex flex-col sm:flex-row">
        {/* Video Area */}
        <div
          className={cn(
            "relative transition-all duration-300 w-full min-h-0",
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
            onToggleMute={updateAudioSendStateForPeers}
            onToggleVideo={updateVideoSendStateForPeers}
            onLeave={onLeave}
          />
          {/* Remote Video Grid */}
          <RemoteVideoGrid />

          <LocalVideoTile localVideoRef={localVideoRef} />
        </div>
        {/* Chat Sidebar */}
        <ChatSidebar
          sendChatMessage={sendChatMessage}
          requestFileDownload={requestFileDownload}
        />
      </div>

      {isHost && requests.length > 0 && (
        <div
          className={cn([
            "fixed left-4 right-4 sm:left-auto sm:right-6 bottom-28 sm:bottom-40 md:bottom-65 z-40 flex sm:w-80 flex-col gap-3 overflow-auto max-h-[40vh] p-2 md:p-4",
            "glass-strong rounded-3xl",
          ])}
        >
          <div className="flex flex-col gap-3">
            <JoinRequestList respondToJoinRequest={respondToJoinRequest} />
          </div>
        </div>
      )}

      {/* Room ID Display */}
      <RoomIdDisplay roomId={roomId} />
    </div>
  );
}
