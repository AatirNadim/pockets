"use client";

import { ThemeToggle } from "@/components/custom/themeToggle";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/lib/stores/userStore";
import { Check, Copy, Users, Video } from "lucide-react";
import React, { useCallback, useState } from "react";

type HeaderProps = { roomId: string; status: string; isConnected: boolean; isRoomFull: boolean };

const Header = ({ roomId, status, isConnected, isRoomFull }: HeaderProps) => {
  const [copied, setCopied] = useState(false);
  const { remoteUsers } = useUserStore();
  const copyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      try {
        await navigator.clipboard.writeText(roomId);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        setCopied(false);
      }
    }
  }, [roomId]);
  const label = isRoomFull ? "Room is full" : isConnected ? "Connected" : status.toLowerCase().includes("approv") ? "Waiting for host approval" : status || "Connecting";
  const count = Object.keys(remoteUsers).length + 1;

  return <header className="z-20 flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-3 dark:border-stone-800 dark:bg-stone-950 sm:gap-3 sm:px-5">
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-600 text-white dark:bg-amber-500 dark:text-stone-950"><Video size={17} /></span>
      <div className="min-w-0"><h1 className="truncate font-semibold leading-tight">Pockets <span className="font-normal text-stone-500">/ Room</span></h1><p role="status" aria-live="polite" className="flex items-center gap-1.5 truncate text-xs text-stone-600 dark:text-stone-400"><span className={`h-2 w-2 shrink-0 rounded-full ${isConnected ? "bg-emerald-600" : isRoomFull ? "bg-rose-600" : "bg-amber-600"}`} />{label}</p></div>
    </div>
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
      <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-sm dark:border-stone-800 dark:bg-stone-900" aria-label={`${count} participants`}><Users size={16} /><span>{count}</span></div>
      <Button type="button" onClick={copyInvite} variant="secondary" size="icon" className="size-10 shrink-0" aria-label={copied ? "Invite copied" : "Copy invite"} aria-live="polite">{copied ? <Check size={16} /> : <Copy size={16} />}<span className="sr-only">{copied ? "Invite copied" : "Copy invite"}</span></Button>
      <ThemeToggle />
    </div>
  </header>;
};

export default Header;
