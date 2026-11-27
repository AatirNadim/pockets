"use client";

import { useState, useEffect, useRef } from "react";
import {
  Check,
  Copy,
  Download,
  FileArchive,
  Mic,
  MicOff,
  Monitor,
  RefreshCw,
  Settings,
  Sliders,
  Video,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";

export function StudioPreview() {
  const [copied, setCopied] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // File download simulation state
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferStatus, setTransferStatus] = useState<"idle" | "streaming" | "completed">("idle");
  const transferIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const mockRoomId = "8f1e3c2b-94d0-4e2b-a1a2-5b9c7e0f81d3";
  const mockInviteUrl = `https://pockets.studio/room/${mockRoomId}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(mockInviteUrl);
      setCopied(true);
      toast.success("Sample invite link copied");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      toast.error("Could not copy the sample invite link");
    }
  };

  const startTransferSimulation = () => {
    if (transferStatus === "streaming") return;
    setTransferStatus("streaming");
    setTransferProgress(0);

    let progress = 0;
    if (transferIntervalRef.current) clearInterval(transferIntervalRef.current);

    transferIntervalRef.current = setInterval(() => {
      progress += Math.floor(Math.random() * 12) + 6;
      if (progress >= 100) {
        progress = 100;
        setTransferProgress(100);
        setTransferStatus("completed");
        if (transferIntervalRef.current) clearInterval(transferIntervalRef.current);
        toast.success("Preview transfer complete");
      } else {
        setTransferProgress(progress);
      }
    }, 140);
  };

  const resetTransfer = () => {
    if (transferIntervalRef.current) clearInterval(transferIntervalRef.current);
    setTransferStatus("idle");
    setTransferProgress(0);
  };

  useEffect(() => {
    return () => {
      if (transferIntervalRef.current) clearInterval(transferIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-5xl rounded-3xl border border-stone-200/90 bg-white/80 p-3 shadow-2xl shadow-stone-900/10 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-900/80 sm:p-6">
      {/* Studio Header Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-200/80 pb-4 dark:border-stone-800 sm:gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-stone-200/75 px-3 py-1 dark:border-stone-700 dark:bg-stone-800 sm:px-3.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-xs font-medium text-stone-700 dark:text-stone-300">
              pocket-8f1e3c2b
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyInvite}
            className="group flex min-h-11 items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-1 text-xs font-medium text-stone-700 transition hover:border-amber-600 hover:bg-stone-200/50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:border-amber-400 dark:hover:bg-stone-700 dark:hover:text-stone-100 dark:focus-visible:ring-amber-400"
            aria-label="Copy mock room invite link"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} className="text-stone-600 group-hover:text-stone-900 dark:text-stone-400 dark:group-hover:text-stone-200" />
                <span>Copy invite</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-200/75 px-2.5 py-1.5 font-medium text-stone-700 dark:bg-stone-800/80 dark:text-stone-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
            Maya (Host)
          </span>
          <span className="rounded-md border border-stone-200 px-2.5 py-1.5 font-mono text-stone-600 dark:border-stone-800 dark:text-stone-400">
            3/6 connected
          </span>
        </div>
      </div>

      {/* Main Studio Viewport: Participant Tiles & File Tray */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {/* Participant 1: Maya (Host) */}
        <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-stone-200 bg-linear-to-b from-stone-100 to-stone-200/90 dark:border-stone-700/80 dark:from-stone-800 dark:to-stone-900">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {/* Audio Wave Halo for speaking state */}
            <div className="relative flex items-center justify-center">
              <span className="absolute h-20 w-20 animate-ping rounded-full bg-amber-500/20 duration-1000" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 text-xl font-semibold text-white shadow-md ring-1 ring-inset ring-white/20 dark:from-amber-600 dark:to-orange-500">
                M
              </div>
            </div>

            {/* Subtle animated sound bars */}
            <div className="mt-4 flex items-center gap-1">
              <span className="h-3 w-1 animate-pulse rounded-full bg-emerald-500" />
              <span className="h-5 w-1 animate-pulse rounded-full bg-emerald-500 [animation-delay:150ms]" />
              <span className="h-4 w-1 animate-pulse rounded-full bg-emerald-500 [animation-delay:300ms]" />
              <span className="h-2 w-1 animate-pulse rounded-full bg-emerald-500 [animation-delay:75ms]" />
            </div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-stone-900/80 px-3 py-1.5 text-xs text-white backdrop-blur-md">
            <span className="flex items-center gap-1.5 font-medium">
              <span>Maya</span>
              <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white">
                Host
              </span>
            </span>
            <div className="flex items-center gap-1.5">
              <Mic size={13} className="text-emerald-400" />
              <Video size={13} className="text-stone-300" />
            </div>
          </div>
        </div>

        {/* Participant 2: Alex (Guest) */}
        <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-stone-200 bg-linear-to-b from-stone-100 to-stone-200/90 dark:border-stone-700/80 dark:from-stone-800 dark:to-stone-900">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-300 text-xl font-semibold text-stone-700 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-stone-700 dark:text-stone-200 dark:ring-white/10">
              A
            </div>
            <p className="mt-3 text-xs text-stone-600 dark:text-stone-400">Listening</p>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-stone-900/80 px-3 py-1.5 text-xs text-white backdrop-blur-md">
            <span className="font-medium">Alex</span>
            <div className="flex items-center gap-1.5">
              <MicOff size={13} className="text-rose-400" />
              <Video size={13} className="text-stone-300" />
            </div>
          </div>
        </div>

        {/* Participant 3: You (Interactive Tile) */}
        <div
          className={`relative aspect-4/3 overflow-hidden rounded-2xl border transition-all sm:col-span-2 sm:aspect-[2/1] lg:col-span-1 lg:aspect-4/3 ${
            cameraActive
              ? "border-amber-400/80 bg-linear-to-b from-amber-50/70 to-stone-100 dark:border-amber-500/40 dark:from-stone-800 dark:to-stone-900"
              : "border-stone-200 bg-stone-100/90 dark:border-stone-800 dark:bg-stone-950"
          }`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {cameraActive ? (
              <div className="relative flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-600/30 bg-white text-xl font-semibold text-amber-900 shadow-md ring-1 ring-inset ring-white/40 dark:border-amber-400/30 dark:bg-stone-800 dark:text-amber-300">
                  You
                </div>
                {micActive && (
                  <div className="mt-3 flex items-center gap-1">
                    <span className="h-2 w-1 animate-pulse rounded-full bg-emerald-500" />
                    <span className="h-3.5 w-1 animate-pulse rounded-full bg-emerald-500 [animation-delay:120ms]" />
                    <span className="h-2 w-1 animate-pulse rounded-full bg-emerald-500 [animation-delay:250ms]" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                  <VideoOff size={22} />
                </div>
                <span className="mt-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                  Camera disabled
                </span>
              </div>
            )}
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-stone-900/80 px-3 py-1.5 text-xs text-white backdrop-blur-md">
            <span className="flex items-center gap-1.5 font-medium">
              <span>You</span>
              <span className="text-[10px] text-stone-300">(Local)</span>
            </span>
            <div className="flex items-center gap-1.5">
              {micActive ? (
                <Mic size={13} className="text-emerald-400" />
              ) : (
                <MicOff size={13} className="text-rose-400" />
              )}
              {cameraActive ? (
                <Video size={13} className="text-stone-300" />
              ) : (
                <VideoOff size={13} className="text-rose-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drop Circle File Tray & Simulated Transfer */}
      <div className="mt-4 rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-950/60 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
              <FileArchive size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="break-all font-mono text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                  brand-assets-v2.zip
                </span>
                <span className="shrink-0 rounded bg-stone-200/80 px-1.5 py-0.5 text-[10px] font-mono text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  4.2 MB
                </span>
              </div>
              <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                Shared by Maya • WebRTC DataChannel (30 KiB chunks)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {transferStatus === "idle" && (
              <button
                type="button"
                onClick={startTransferSimulation}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-700 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-400"
              >
                <Download size={14} />
                <span>Simulate Download</span>
              </button>
            )}

            {transferStatus === "streaming" && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-medium text-amber-700 dark:text-amber-400">
                  {((transferProgress / 100) * 4.2).toFixed(1)} MB / 4.2 MB ({transferProgress}%)
                </span>
                <button
                  type="button"
                  onClick={resetTransfer}
                  title="Cancel transfer"
                  aria-label="Cancel transfer"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-200/75 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                >
                  <RefreshCw size={14} className="animate-spin" />
                </button>
              </div>
            )}

            {transferStatus === "completed" && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <Check size={14} /> Complete
                </span>
                <button
                  type="button"
                  onClick={resetTransfer}
                  className="min-h-11 rounded-xl border border-stone-200 bg-white px-3.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200/75 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Progress Bar */}
        {transferStatus !== "idle" && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-orange-500 transition-all duration-150 ease-out dark:from-amber-400 dark:to-orange-500"
                style={{ width: `${transferProgress}%` }}
              />
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[11px] text-stone-600 dark:text-stone-400">
              <span>Direct peer-to-peer slice transfer</span>
              <span className="font-mono">Chunk size: 30,720 bytes</span>
            </div>
          </div>
        )}
      </div>

      {/* Dock Toolbar (Tactile Media Dock) */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/80 pt-4 dark:border-stone-800">
        <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
          <Sliders size={14} />
          <span>Tactile Controls Preview</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mic Toggle */}
          <button
            type="button"
            onClick={() => {
              setMicActive(!micActive);
            }}
            title={micActive ? "Mute microphone" : "Unmute microphone"}
            aria-label={micActive ? "Mute microphone" : "Unmute microphone"}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-amber-400 ${
              micActive
                ? "border-stone-300 bg-white text-stone-800 hover:bg-stone-200/75 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            {micActive ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          {/* Camera Toggle */}
          <button
            type="button"
            onClick={() => {
              setCameraActive(!cameraActive);
            }}
            title={cameraActive ? "Disable camera" : "Enable camera"}
            aria-label={cameraActive ? "Disable camera" : "Enable camera"}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-amber-400 ${
              cameraActive
                ? "border-stone-300 bg-white text-stone-800 hover:bg-stone-200/75 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            {cameraActive ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          {/* Screen Share Mock */}
          <button
            type="button"
            onClick={() => {
              setScreenSharing(!screenSharing);
            }}
            title="Screen share preview"
            aria-label="Screen share preview"
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-amber-400 ${
              screenSharing
                ? "border-amber-400 bg-amber-100/70 text-amber-800 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-stone-300 bg-white text-stone-800 hover:bg-stone-200/75 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            <Monitor size={18} />
          </button>

          {/* Settings Mock */}
          <button
            type="button"
            onClick={() => {
              setShowSettings(!showSettings);
            }}
            title="Device settings preview"
            aria-label="Device settings preview"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-800 transition-all hover:bg-stone-200/75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 dark:focus-visible:ring-amber-400"
          >
            <Settings size={18} />
          </button>

          {/* Leave Button */}
          <button
            type="button"
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-200/90 bg-rose-50 px-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
          >
            <span>Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
}
