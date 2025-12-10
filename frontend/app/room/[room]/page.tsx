"use client";

import type React from "react";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

import MediaControl from "@/components/custom/mediaControl";
import { useMediaStore } from "@/lib/stores/mediaStore";
import { useVoiceActivityStore } from "@/lib/stores/voiceActivityStore";
import { useSocket } from "@/lib/hooks/socketHook";
import { useUserStore } from "@/lib/stores/userStore";
import { useJoinRequestStore } from "@/lib/stores/joinRequestStore";
import { UserType } from "@/lib/constants";
import { cn, isValidUUID } from "@/lib/utils";
import LocalVideoTile from "@/components/custom/localVideoTile";
import JoinRequestList from "@/components/custom/joinRequestList";
import Header from "./header";
import RemoteVideoGrid from "./remoteVideoGrid";
import ChatSidebar from "@/components/custom/chat/chatSidebar";
import RoomIdDisplay from "@/components/custom/roomIdDisplay";

export default function Room() {
  const {
    availableCameras,
    availableMicrophones,
    selectedCameraId,
    selectedMicrophoneId,
  } = useMediaStore();
  const { userType, userId } = useUserStore();
  const { levels: voiceLevels } = useVoiceActivityStore();

  const router = useRouter();
  const params = useParams();
  const roomId = params.room as string;

  const {
    localVideoRef,
    connectToRoom,
    cleanUp,
    switchCamera,
    switchMicrophone,
    respondToJoinRequest,
    sendChatMessage,
    requestFileDownload,
  } = useSocket();
  const { requests } = useJoinRequestStore();
  const isHost = userType === UserType.HOST;

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

  return (
    <div className="relative flex h-screen max-h-screen w-screen flex-col bg-gradient-to-br from-white via-indigo-50 to-purple-100 text-slate-900 dark:from-gray-900 dark:via-gray-900 dark:to-black dark:text-white">
      {/* Header */}
      <Header roomId={roomId} />

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
        <div className="fixed right-6 bottom-40 z-40 flex w-80 flex-col gap-3">
          <JoinRequestList respondToJoinRequest={respondToJoinRequest} />
        </div>
      )}

      {/* Room ID Display */}
      <RoomIdDisplay roomId={roomId} />
    </div>
  );
}
