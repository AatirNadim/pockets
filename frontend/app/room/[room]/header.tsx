"use client";

import { ThemeToggle } from "@/components/custom/themeToggle";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUserStore } from "@/lib/stores/userStore";
import { Check, ChevronDown, Copy, Users, Video } from "lucide-react";
import { toast } from "sonner";
import React, { useCallback, useEffect, useState } from "react";
import { KeyboardShortcuts, type Shortcut } from "@/components/custom/keyboardShortcuts";

type HeaderProps = { roomId: string; status: string; isConnected: boolean; isRoomFull: boolean; shortcuts: Shortcut[]; onShortcut: (key: string) => void };

const Header = ({ roomId, status, isConnected, isRoomFull, shortcuts, onShortcut }: HeaderProps) => {
  const [copied, setCopied] = useState(false);
  const { remoteUsers } = useUserStore();
  const copyValue = useCallback(async (kind: "link" | "id") => {
    try {
      await navigator.clipboard.writeText(kind === "link" ? `${window.location.origin}${window.location.pathname}` : roomId);
      toast.success(kind === "link" ? "Invite link copied" : "Room ID copied", { id: "room-invite" });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      toast.error(kind === "link" ? "Could not copy the invite link" : "Could not copy the room ID", { id: "room-invite" });
    }
  }, [roomId]);
  const copyInvite = useCallback(() => { void copyValue("link"); }, [copyValue]);
  useEffect(() => {
    window.addEventListener("pockets:copy-invite", copyInvite);
    return () => window.removeEventListener("pockets:copy-invite", copyInvite);
  }, [copyInvite]);
  const label = isRoomFull ? "Room is full" : isConnected ? "Connected" : status.toLowerCase().includes("approv") ? "Waiting for host approval" : status || "Connecting";
  const count = Object.keys(remoteUsers).length + 1;

  return <header className="z-20 flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-[max(0.625rem,env(safe-area-inset-left))] pr-[max(0.625rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] dark:border-stone-800 dark:bg-stone-950 sm:min-h-16 sm:gap-3 sm:px-5">
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-600 text-white dark:bg-amber-400 dark:text-stone-950"><Video size={17} /></span>
      <div className="min-w-0"><h1 className="truncate text-sm font-semibold tracking-tight leading-tight sm:text-base">Pockets <span className="hidden font-normal text-stone-600 dark:text-stone-400 sm:inline">/ Room</span></h1><p role="status" aria-live="polite" className="flex items-center gap-1.5 truncate text-xs text-stone-600 dark:text-stone-400"><span className={`h-2 w-2 shrink-0 rounded-full ${isConnected ? "bg-emerald-600 dark:bg-emerald-500" : isRoomFull ? "bg-rose-600 dark:bg-rose-400" : "bg-amber-600 dark:bg-amber-400"}`} /><span className="truncate">{label}</span></p></div>
    </div>
    <div className="flex shrink-0 items-center gap-1 sm:gap-2.5">
      <div className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-stone-200 bg-white px-2 text-xs font-medium dark:border-stone-800 dark:bg-stone-900 sm:gap-1.5 sm:px-3 sm:text-sm" aria-label={`${count} participants`}><Users size={15} /><span>{count}</span></div>
      <div className="flex shrink-0">
        <Button type="button" onClick={copyInvite} variant="secondary" size="icon" className="size-11 rounded-r-none" aria-label={copied ? "Copied" : "Copy invite link"} aria-live="polite">{copied ? <Check size={16} /> : <Copy size={16} />}</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button type="button" variant="secondary" size="icon" className="h-11 w-8 rounded-l-none border-l border-stone-300 dark:border-stone-700" aria-label="More copy options"><ChevronDown size={16} /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void copyValue("id")}>Copy room ID</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
      <KeyboardShortcuts shortcuts={shortcuts} onShortcut={onShortcut} />
      <ThemeToggle />
    </div>
  </header>;
};

export default Header;
