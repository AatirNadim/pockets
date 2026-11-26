import { Crown, Maximize2, Minimize2, VideoOff } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Draggable from "react-draggable";
import { Button } from "../ui/button";
import { useMediaStore } from "@/lib/stores/mediaStore";
import { useUserStore } from "@/lib/stores/userStore";
import { UserType } from "@/lib/constants";

type LocalVideoTileProps = {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
};

const LocalVideoTile = ({ localVideoRef }: LocalVideoTileProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const tileRef = useRef<HTMLDivElement>(null);

  const { userName, userType } = useUserStore();

  const localDisplayName = userName || "You";
  const isHost = userType === UserType.HOST;

  const { isVideoOff } = useMediaStore();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const onChange = () => setIsMobile(mediaQuery.matches);
    onChange();
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  const clampPosition = useCallback((nextX: number, nextY: number) => {
    const tile = tileRef.current;
    const parent = tile?.parentElement as HTMLElement | null;
    if (!tile || !parent) {
      return { x: nextX, y: nextY };
    }

    const maxX = Math.max(0, parent.clientWidth - tile.offsetWidth);
    const maxY = Math.max(0, parent.clientHeight - tile.offsetHeight);

    return {
      x: Math.min(Math.max(nextX, 0), maxX),
      y: Math.min(Math.max(nextY, 0), maxY),
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setPosition({ x: 0, y: 0 });
      return;
    }

    // Initialize inside the video stage (which is already scoped above MediaControl).
    const id = window.requestAnimationFrame(() => {
      const tile = tileRef.current;
      const parent = tile?.parentElement as HTMLElement | null;
      if (!tile || !parent) return;

      const padding = 14;
      const topOffset = 14;

      const initial = clampPosition(
        Math.max(padding, parent.clientWidth - tile.offsetWidth - padding),
        Math.max(padding, topOffset)
      );

      setPosition(initial);
    });

    return () => window.cancelAnimationFrame(id);
  }, [clampPosition, isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    setPosition((prev) => clampPosition(prev.x, prev.y));
  }, [clampPosition, isMinimized, isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition, isMobile]);

  const tile = (
    <div
      ref={tileRef}
      className={`absolute z-30 bg-white/80 dark:bg-stone-900/80 rounded-2xl overflow-hidden shadow-xl border border-stone-200/50 dark:border-stone-700/50 backdrop-blur-sm transition-all duration-300 ${
        isMobile
          ? "top-0 left-0 touch-none cursor-grab active:cursor-grabbing"
          : "bottom-5 right-6 lg:bottom-6 lg:right-8"
      } ${isMinimized ? "w-16 h-12" : "w-36 h-28 sm:w-48 sm:h-36"}`}
    >
      {isHost && !isMinimized && (
        <div className="absolute top-2 left-2 z-10 group">
          <div className="flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg transition-transform duration-150 group-hover:scale-105 dark:bg-amber-400 dark:text-stone-950">
            <Crown className="w-3 h-3" />
          </div>
          <div className="pointer-events-none absolute -bottom-12 left-0 w-36 rounded-xl bg-stone-900/90 dark:bg-stone-800/90 px-2 py-1 text-[10px] text-center text-white opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
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
        <div className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-stone-900/80 px-2.5 py-0.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm dark:bg-stone-800/90 sm:bottom-3 sm:left-3 sm:px-3 sm:py-1 sm:text-sm">
          {localDisplayName}
        </div>
      )}
      {isVideoOff && (
        <div className="absolute inset-0 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          <VideoOff
            className={`text-stone-500 dark:text-stone-400 ${
              isMinimized ? "w-4 h-4" : "w-8 h-8"
            }`}
          />
        </div>
      )}

      <Button
        onClick={() => setIsMinimized(!isMinimized)}
        variant="ghost"
        size="icon"
        aria-label={isMinimized ? "Expand self video" : "Minimize self video"}
        title={isMinimized ? "Expand self video" : "Minimize self video"}
        className={`absolute bg-white/85 text-stone-700 hover:bg-stone-200/80 dark:bg-stone-800/85 dark:hover:bg-stone-700 dark:text-white transition-colors rounded-xl ${
          isMinimized ? "top-1.5 right-1.5 size-9" : "top-2 right-2 size-11"
        }`}
      >
        {isMinimized ? (
          <Maximize2 className="w-3.5 h-3.5" />
        ) : (
          <Minimize2 className="w-4 h-4" />
        )}
      </Button>
    </div>
  );

  return (
    isMobile ? (
      <Draggable
        nodeRef={tileRef}
        bounds="parent"
        position={position}
        onDrag={(_, data) => {
          setPosition(clampPosition(data.x, data.y));
        }}
        onStop={(_, data) => {
          setPosition(clampPosition(data.x, data.y));
        }}
        cancel="button"
      >
        {tile}
      </Draggable>
    ) : (
      tile
    )
  );
};

export default LocalVideoTile;
