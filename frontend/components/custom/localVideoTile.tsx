import { Crown, Maximize2, Minimize2, VideoOff } from "lucide-react";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { useMediaStore } from "@/lib/stores/mediaStore";
import { useUserStore } from "@/lib/stores/userStore";
import { UserType } from "@/lib/constants";

type LocalVideoTileProps = {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
};

const LocalVideoTile = ({ localVideoRef }: LocalVideoTileProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const { userName, userType } = useUserStore();

  const localDisplayName = userName || "You";
  const isHost = userType === UserType.HOST;

  const { isVideoOff } = useMediaStore();

  return (
    <div
      className={`absolute bottom-24 right-8 bg-white rounded-lg overflow-hidden shadow-xl border-2 border-white/70 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 dark:border-white/20 transition-all duration-300 ${
        isMinimized ? "w-16 h-12" : "w-48 h-36"
      }`}
    >
      {isHost && !isMinimized && (
        <div className="absolute top-2 left-2 z-10 group">
          <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg transition-transform duration-150 group-hover:scale-105">
            <Crown className="w-3 h-3" />
          </div>
          <div className="pointer-events-none absolute -bottom-12 left-0 w-36 rounded-md bg-black/80 px-2 py-1 text-[10px] text-center text-white opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
            This participant controls the room
          </div>
        </div>
      )}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {!isMinimized && (
        <div className="absolute bottom-3 left-3 rounded-full bg-[#1c0f3f]/80 px-3 py-1 text-sm font-medium text-white shadow-lg backdrop-blur">
          {localDisplayName}
        </div>
      )}
      {isVideoOff && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-gray-800 flex items-center justify-center">
          <VideoOff
            className={`text-slate-500 dark:text-gray-400 ${
              isMinimized ? "w-4 h-4" : "w-8 h-8"
            }`}
          />
        </div>
      )}

      {/* <div className="absolute top-2 left-2 bg-white/80 text-slate-800 dark:bg-black/50 dark:text-white backdrop-blur-sm rounded px-2 py-1">
        <div className="flex items-center gap-2">
          <span
                    className={`font-medium ${
                      isMinimized ? "text-[10px]" : "text-xs"
                    }`}
                  >
                    You
                  </span>
          <span
                    className={`flex items-center gap-1 rounded-full px-2 py-[2px] text-[9px] font-semibold uppercase tracking-wide transition-all ${
                      isSpeakingLocally
                        ? "bg-emerald-400/90 text-emerald-950"
                        : "bg-black/40 text-white/80"
                    }`}
                    style={{
                      boxShadow: isSpeakingLocally
                        ? `0 0 ${6 + localVoiceLevel * 10}px rgba(16,185,129,${
                            0.45 + localVoiceLevel * 0.3
                          })`
                        : undefined,
                    }}
                  >
                    <span
                      className="inline-block h-[6px] w-[6px] rounded-full bg-current"
                      style={{
                        transform: `scale(${0.9 + localVoiceLevel * 0.5})`,
                        transition: "transform 120ms ease-out",
                      }}
                    ></span>
                    {isSpeakingLocally ? "Speaking" : "Live"}
                  </span>
        </div>
      </div> */}

      <Button
        onClick={() => setIsMinimized(!isMinimized)}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 w-6 h-6 p-0 bg-white/70 text-slate-700 hover:bg-white/90 dark:bg-black/50 dark:hover:bg-black/70 dark:text-white transition-colors"
      >
        {isMinimized ? (
          <Maximize2 className="w-3 h-3" />
        ) : (
          <Minimize2 className="w-3 h-3" />
        )}
      </Button>
    </div>
  );
};

export default LocalVideoTile;
