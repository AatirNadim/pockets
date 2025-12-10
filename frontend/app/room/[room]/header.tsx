"use client";

import { ThemeToggle } from "@/components/custom/themeToggle";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/lib/hooks/socketHook";
import { useUserStore } from "@/lib/stores/userStore";
import { Copy, Sparkles, Users } from "lucide-react";
import React, { useCallback, useState } from "react";

type HeaderProps = {
  roomId: string;
};

const Header = ({ roomId }: HeaderProps) => {
  const [roomCopied, setRoomCopied] = useState(false);
  const { status, isConnected, isRoomFull } = useSocket();
  const { remoteUsers } = useUserStore();

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
    ? "bg-green-400"
    : isRoomFull
    ? "bg-red-400"
    : "bg-yellow-400 animate-pulse";

  return (
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
  );
};

export default Header;
