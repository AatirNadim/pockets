"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useMediaStore } from "@/lib/stores/mediaStore";
import { useSocket } from "@/lib/hooks/socketHook";
import { useUserStore } from "@/lib/stores/userStore";
import { useJoinRequestStore } from "@/lib/stores/joinRequestStore";
import { useChatStore } from "@/lib/stores/chatStore";
import type { Shortcut } from "@/components/custom/keyboardShortcuts";
import { UserType } from "@/lib/constants";
import { cn, isValidUUID } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

const ROOM_SHORTCUTS: Shortcut[] = [
  { key: "m", label: "Toggle microphone" },
  { key: "v", label: "Toggle camera" },
  { key: "s", label: "Toggle speaker audio" },
  { key: "c", label: "Open or close chat and files" },
  { key: "i", label: "Copy room invite" },
  { key: "l", label: "Open leave room confirmation" },
];

export default function Room() {
  const {
    availableCameras,
    availableMicrophones,
    selectedCameraId,
    selectedMicrophoneId,
    mediaError,
    setMediaError,
    isMicrophoneMuted,
    isVideoOff,
    toggleSpeakerOff,
  } = useMediaStore();
  const toggleShowChat = useChatStore((state) => state.toggleShowChat);
  const {
    userType,
    userId,
    initializeUserAsGuest,
    setRoomId,
    roomId: storedRoomId,
  } = useUserStore();

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
    requestFileAvailability,
    requestFileReupload,
  } = useSocket();
  const { requests } = useJoinRequestStore();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [entryReady, setEntryReady] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [guestName, setGuestName] = useState("");
  const didValidateEntry = useRef(false);
  const isHost = userType === UserType.HOST;

  const cleanUpRef = useRef(cleanUp);
  const connectToRoomRef = useRef(connectToRoom);

  useEffect(() => {
    if (didValidateEntry.current) return;
    didValidateEntry.current = true;
    if (!isValidUUID(roomId)) {
      toast.error("This room link is not valid.");
      router.push("/");
      return;
    }
    if (userId && storedRoomId === roomId) setEntryReady(true);
    else setNeedsName(true);
  }, [
    router,
    roomId,
    userId,
    storedRoomId,
  ]);

  // cleanupref will always have latest cleanUp function
  useEffect(() => {
    cleanUpRef.current = cleanUp;
  }, [cleanUp]);

  useEffect(() => {
    connectToRoomRef.current = connectToRoom;
  }, [connectToRoom]);

  useEffect(() => {
    if (!leaveDialogOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLeaveDialogOpen(false);
        window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-label="Leave room"]')?.focus());
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [leaveDialogOpen]);

  useEffect(() => {
    if (!entryReady || !isValidUUID(roomId) || !userId) return;
    void connectToRoomRef.current();
  }, [entryReady, roomId, userId]);

  useEffect(() => {
    if (!entryReady) return;
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
  }, [entryReady]);

  const onLeave = useCallback(() => {
    cleanUpRef.current();
    toast.info("You left the room");
    router.push("/");
  }, [router]);

  const onToggleSpeaker = useCallback(() => {
    toggleSpeakerOff();
    toast.info(useMediaStore.getState().isSpeakerOff ? "Room audio muted" : "Room audio unmuted", { id: "room-speaker" });
  }, [toggleSpeakerOff]);

  const handleShortcut = useCallback((key: string) => {
    if (key === "m") {
      void updateAudioSendStateForPeers(!isMicrophoneMuted);
    } else if (key === "v") {
      void updateVideoSendStateForPeers(!isVideoOff);
    } else if (key === "s") {
      onToggleSpeaker();
    } else if (key === "c") {
      toggleShowChat();
    } else if (key === "i") {
      window.dispatchEvent(new CustomEvent("pockets:copy-invite"));
    } else if (key === "l") {
      setLeaveDialogOpen(true);
    }
  }, [isMicrophoneMuted, isVideoOff, toggleShowChat, onToggleSpeaker, updateAudioSendStateForPeers, updateVideoSendStateForPeers]);

  if (!entryReady) return needsName ? (
    <main className="grid min-h-dvh place-items-center bg-stone-50 p-4 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <section role="dialog" aria-modal="true" aria-labelledby="join-title" aria-describedby="join-description" className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">Room invitation</p>
        <h1 id="join-title" className="mt-3 text-2xl font-semibold tracking-tight">What should we call you?</h1>
        <p id="join-description" className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">The host will see your name when you ask to join.</p>
        <form className="mt-6" onSubmit={(event) => {
          event.preventDefault();
          const name = guestName.trim();
          if (!name) return;
          setRoomId(roomId);
          initializeUserAsGuest(name);
          setNeedsName(false);
          setEntryReady(true);
        }}>
          <label htmlFor="guest-name" className="text-sm font-medium">Display name</label>
          <input id="guest-name" autoFocus required maxLength={40} autoComplete="nickname" value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="e.g. Maya" className="mt-2 h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-stone-700 dark:bg-stone-950 dark:focus-visible:ring-amber-400" />
          <div className="mt-6 flex gap-3"><Button type="button" variant="secondary" className="min-h-11 flex-1" onClick={() => router.push("/")}>Cancel</Button><Button type="submit" disabled={!guestName.trim()} className="min-h-11 flex-1 bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300">Request to join</Button></div>
        </form>
      </section>
    </main>
  ) : null;

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">

      {/* Header */}
      <Header
        roomId={roomId}
        status={status}
        isConnected={isConnected}
        isRoomFull={isRoomFull}
        shortcuts={ROOM_SHORTCUTS}
        onShortcut={handleShortcut}
      />
      {mediaError && <div role="status" className="z-10 flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100 sm:flex-nowrap sm:gap-3 sm:px-4"><span className="min-w-0 flex-1">{mediaError}</span><Button variant="ghost" size="sm" className="min-h-11 shrink-0" onClick={() => setMediaError(null)} aria-label="Dismiss media notice">Dismiss</Button></div>}

      {/* Main Content */}
      <div className="w-full flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Video Area */}
        <div
          className={cn(
            "relative transition-all duration-300 w-full min-h-0 flex-1",
            "flex flex-col"
          )}
        >
          {/* Video Stage (scoped above MediaControl so LocalVideoTile never overlaps controls) */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            {/* Remote Video Grid */}
            <RemoteVideoGrid status={status} isConnected={isConnected} />

            <LocalVideoTile localVideoRef={localVideoRef} />
          </div>
          <MediaControl
            cameras={availableCameras}
            microphones={availableMicrophones}
            selectedCameraId={selectedCameraId}
            selectedMicrophoneId={selectedMicrophoneId}
            onCameraChange={switchCamera}
            onMicrophoneChange={switchMicrophone}
            onToggleMute={updateAudioSendStateForPeers}
            onToggleVideo={updateVideoSendStateForPeers}
            onToggleSpeaker={onToggleSpeaker}
            onLeave={() => setLeaveDialogOpen(true)}
          />
        </div>
        {/* Chat Sidebar */}
        <ChatSidebar
          sendChatMessage={sendChatMessage}
          requestFileDownload={requestFileDownload}
          requestFileAvailability={requestFileAvailability}
          requestFileReupload={requestFileReupload}
        />
      </div>

      {isHost && requests.length > 0 && (
        <section aria-label="Pending guest requests" className="fixed left-3 right-3 top-[calc(4rem+env(safe-area-inset-top))] z-40 max-h-[35dvh] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900 sm:left-auto sm:right-4 sm:top-20 sm:w-80">
          <div className="flex flex-col gap-3">
            <JoinRequestList respondToJoinRequest={respondToJoinRequest} />
          </div>
        </section>
      )}

      {leaveDialogOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-stone-950/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLeaveDialogOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="leave-title" onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }} className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-700 dark:bg-stone-900 sm:p-6">
          <h2 id="leave-title" className="text-lg font-semibold tracking-tight">Leave this room?</h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{isHost ? "Leaving as host ends the room for everyone." : "You can request to join again while the host keeps the room open."}</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3"><Button autoFocus size="lg" variant="secondary" onClick={() => { setLeaveDialogOpen(false); window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-label="Leave room"]')?.focus()); }}>Stay</Button><Button size="lg" className="bg-rose-600 text-white hover:bg-rose-700" onClick={onLeave}>Leave room</Button></div>
        </section>
      </div>}
    </div>
  );
}
