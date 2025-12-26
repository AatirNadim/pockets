"use client";

import { ThemeToggle } from "@/components/custom/themeToggle";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/lib/stores/userStore";
import { Copy, Sparkles, Users } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

type HeaderProps = {
  roomId: string;
  status: string;
  isConnected: boolean;
  isRoomFull: boolean;
};

const Header = ({ roomId, status, isConnected, isRoomFull }: HeaderProps) => {
  const [roomCopied, setRoomCopied] = useState(false);
  const { remoteUsers } = useUserStore();

  useEffect(() => {
    console.log("Header status changed:", status);
  }, [status]);

  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setRoomCopied(true);
      setTimeout(() => setRoomCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy room ID:", err);
    }
  }, [roomId]);

  const connectionIndicatorClass = isConnected
    ? "bg-emerald-400"
    : isRoomFull
    ? "bg-rose-400"
    : "bg-amber-400 animate-pulse";

  return (
    <div className="z-20 glass border-b border-stone-200/50 dark:border-stone-700/50 h-20">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-linear-to-br from-amber-500 via-orange-500 to-rose-500 rounded-xl shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient-warm">Pockets</h1>
            <div className="flex items-center space-x-2 text-xs text-stone-500 dark:text-stone-400">
              <div
                className={`w-2 h-2 rounded-full ${connectionIndicatorClass}`}
              ></div>
              <span className="capitalize">{status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-stone-100/80 text-stone-700 rounded-xl px-3 py-1.5 border border-stone-200/50 shadow-sm dark:bg-stone-800/80 dark:border-stone-700/50 dark:text-stone-300">
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
            className="text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-white dark:hover:bg-stone-800 transition-all duration-200 rounded-xl"
          >
            <Copy className="w-4 h-4 mr-2" />
            {roomCopied ? "Copied!" : "Copy ID"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Header;
