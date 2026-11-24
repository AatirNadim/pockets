"use client";

import { useState, useCallback } from "react";
import { ArrowRight, ClipboardPaste, Dices, Link2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { isValidUUID, generateRandomUsername } from "@/lib/utils";

interface RoomEntryConsoleProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  activeTab: "create" | "join";
  setActiveTab: (tab: "create" | "join") => void;
  roomId: string;
  setRoomId: (val: string) => void;
  busy: boolean;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export function RoomEntryConsole({
  displayName,
  setDisplayName,
  activeTab,
  setActiveTab,
  roomId,
  setRoomId,
  busy,
  onCreateRoom,
  onJoinRoom,
}: RoomEntryConsoleProps) {
  const [roomIdError, setRoomIdError] = useState<string | null>(null);

  const handleGenerateAlias = useCallback(() => {
    const alias = generateRandomUsername();
    setDisplayName(alias);
    toast.info(`Assigned alias: ${alias}`);
  }, [setDisplayName]);

  const handlePaste = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        const trimmed = text.trim();
        if (trimmed) {
          setRoomId(trimmed);
          if (isValidUUID(trimmed)) {
            setRoomIdError(null);
            toast.success("Room ID pasted from clipboard");
          } else {
            setRoomIdError("The pasted string does not appear to be a valid UUID.");
          }
        }
      } else {
        toast.error("Clipboard access not available in this browser context.");
      }
    } catch {
      toast.error("Unable to read from clipboard.");
    }
  }, [setRoomId]);

  const handleRoomIdChange = (val: string) => {
    setRoomId(val);
    if (roomIdError && (val === "" || isValidUUID(val.trim()))) {
      setRoomIdError(null);
    }
  };

  const handlePrimaryAction = () => {
    if (activeTab === "create") {
      onCreateRoom();
    } else {
      const cleanId = roomId.trim();
      if (!cleanId) {
        setRoomIdError("Please enter a room invite ID.");
        toast.error("Please enter a room invite ID.");
        return;
      }
      if (!isValidUUID(cleanId)) {
        setRoomIdError("Enter a valid room UUID (e.g. 8f1e3c2b-94d0-4e2b-a1a2-5b9c7e0f81d3).");
        toast.error("Invalid room invite ID format.");
        return;
      }
      setRoomIdError(null);
      onJoinRoom();
    }
  };

  return (
    <section
      aria-labelledby="entry-title"
      className="relative rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-xl shadow-stone-900/5 backdrop-blur-md transition-shadow hover:shadow-2xl hover:shadow-stone-900/10 dark:border-stone-800 dark:bg-stone-900/90 dark:shadow-black/20 sm:p-8"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 id="entry-title" className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Studio Access
            </h2>
          </div>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Instant peer-to-peer room. No email or login required.
          </p>
        </div>
      </div>

      {/* Segmented Switcher */}
      <div
        role="tablist"
        aria-label="Room entry mode"
        className="grid grid-cols-2 rounded-xl bg-stone-100 p-1.5 dark:bg-stone-800/80"
      >
        <button
          type="button"
          role="tab"
          id="tab-create"
          aria-selected={activeTab === "create"}
          aria-controls="panel-create"
          onClick={() => {
            setActiveTab("create");
            setRoomIdError(null);
          }}
          className={`flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
            activeTab === "create"
              ? "bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100"
              : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          }`}
        >
          Create a room
        </button>
        <button
          type="button"
          role="tab"
          id="tab-join"
          aria-selected={activeTab === "join"}
          aria-controls="panel-join"
          onClick={() => {
            setActiveTab("join");
            window.requestAnimationFrame(() => {
              document.getElementById("room-id")?.focus();
            });
          }}
          className={`flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
            activeTab === "join"
              ? "bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100"
              : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          }`}
        >
          Join a room
        </button>
      </div>

      {/* Display Name Input */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <label htmlFor="display-name" className="text-sm font-medium text-stone-800 dark:text-stone-200">
            Display name <span className="font-normal text-stone-500 dark:text-stone-400">(optional)</span>
          </label>
          <button
            type="button"
            onClick={handleGenerateAlias}
            title="Generate random alias"
            aria-label="Generate random alias"
            className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1.5 py-0.5"
          >
            <Dices size={14} className="transition-transform active:rotate-180" />
            <span>Randomize</span>
          </button>
        </div>
        <div className="relative mt-2">
          <input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            autoComplete="nickname"
            placeholder="e.g. Maya or SwiftFox429"
            aria-describedby="display-name-help"
            className="h-12 w-full rounded-xl border border-stone-300 bg-stone-50/50 px-4 text-base text-stone-900 transition-colors placeholder:text-stone-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-stone-700 dark:bg-stone-950/60 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:bg-stone-950"
          />
        </div>
        <p id="display-name-help" className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
          Seen by peers in the room. If empty, a friendly alias is assigned automatically.
        </p>
      </div>

      {/* Room ID Input (when Join tab is active) */}
      {activeTab === "join" && (
        <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-200" id="panel-join">
          <div className="flex items-center justify-between">
            <label htmlFor="room-id" className="text-sm font-medium text-stone-800 dark:text-stone-200">
              Room invite ID
            </label>
            <button
              type="button"
              onClick={handlePaste}
              title="Paste from clipboard"
              className="flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1.5 py-0.5"
            >
              <ClipboardPaste size={14} />
              <span>Paste</span>
            </button>
          </div>
          <div className="relative mt-2">
            <Link2
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
              aria-hidden="true"
            />
            <input
              id="room-id"
              value={roomId}
              onChange={(e) => handleRoomIdChange(e.target.value)}
              placeholder="e.g. 8f1e3c2b-94d0-4e2b-a1a2-5b9c7e0f81d3"
              aria-describedby={roomIdError ? "room-id-error" : "room-id-help"}
              aria-invalid={Boolean(roomIdError)}
              className={`h-12 w-full rounded-xl border bg-stone-50/50 pl-11 pr-4 font-mono text-sm tracking-tight text-stone-900 transition-colors placeholder:font-sans placeholder:text-stone-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:bg-stone-950/60 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:bg-stone-950 ${
                roomIdError
                  ? "border-rose-500 focus-visible:ring-rose-500 dark:border-rose-500"
                  : "border-stone-300 dark:border-stone-700"
              }`}
            />
          </div>
          {roomIdError ? (
            <p id="room-id-error" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
              {roomIdError}
            </p>
          ) : (
            <p id="room-id-help" className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
              The host provides this UUID when they open a Pocket.
            </p>
          )}
        </div>
      )}

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={handlePrimaryAction}
        disabled={busy}
        className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 font-semibold text-white shadow-sm transition-all hover:bg-amber-800 active:scale-[0.99] disabled:active:scale-100 disabled:pointer-events-none disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300"
      >
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Opening room…</span>
          </>
        ) : activeTab === "create" ? (
          <>
            <span>Create room</span>
            <ArrowRight size={18} />
          </>
        ) : (
          <>
            <span>Request to join</span>
            <Users size={18} />
          </>
        )}
      </button>

      {/* Trust & Network disclaimer */}
      <p className="mt-4 text-center text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Peer connections require WebRTC media permissions. File transfers are pull-based and stream directly
        between browsers.
      </p>
    </section>
  );
}
