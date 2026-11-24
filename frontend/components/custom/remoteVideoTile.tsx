import { Crown, Eye, EyeOff, MicOff, VideoOff, Volume2, VolumeX, Waves } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PeerConnectionStatus } from "@/lib/stores/connectionStore";

type RemoteVideoTileProps = {
  stream: MediaStream;
  userName?: string;
  userId: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  voiceLevel?: number;
  isHost?: boolean;
  connectionPhase?: PeerConnectionStatus["phase"];
  connectionIssue?: string;
};

const RemoteVideoTile = ({
  stream,
  userName,
  userId,
  videoEnabled,
  audioEnabled,
  voiceLevel = 0,
  isHost = false,
  connectionPhase,
  connectionIssue,
}: RemoteVideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLocallyMuted, setIsLocallyMuted] = useState(false);
  const [isVideoHiddenForMe, setIsVideoHiddenForMe] = useState(false);
  const normalizedLevel = Math.min(Math.max(voiceLevel, 0), 1);
  const isSpeaking = audioEnabled && normalizedLevel > 0.18;
  const displayName = userName || `Participant ${userId.slice(0, 4)}`;
  const connectionInterrupted = connectionPhase === "failed" || connectionPhase === "reconnecting";

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    if (videoEnabled && !isVideoHiddenForMe && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      return;
    }

    videoRef.current.srcObject = null;
  }, [stream, videoEnabled, isVideoHiddenForMe]);

  useEffect(() => {
    if (audioRef.current.srcObject !== stream) {
      audioRef.current.srcObject = stream;
    }
    audioRef.current.muted = isLocallyMuted;

    if (audioEnabled) {
      void audioRef.current.play().catch(() => undefined);
      return;
    }

    audioRef.current.pause();
  }, [stream, audioEnabled, isLocallyMuted]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-stone-200/50 bg-stone-900/60 shadow-xl transition-all duration-200 dark:border-stone-700/50 ${
        isSpeaking
          ? "ring-2 ring-amber-400 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]"
          : ""
      }`}
      style={
        isSpeaking
          ? {
              boxShadow: `0 0 ${18 + normalizedLevel * 20}px rgba(251,191,36,${
                0.2 + normalizedLevel * 0.4
              })`,
            }
          : undefined
      }
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${
          videoEnabled && !isVideoHiddenForMe && !connectionInterrupted ? "opacity-100" : "opacity-0"
        }`}
      />
      <audio ref={audioRef} autoPlay className="hidden" />
      <div className="absolute bottom-3 left-3 rounded-full bg-stone-900/80 dark:bg-stone-800/90 px-3 py-1 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
        {displayName}
      </div>
      {isHost && (
        <div className="absolute bottom-3 right-3 group">
          <div className="flex items-center gap-1 rounded-full bg-linear-to-r from-amber-400 via-orange-500 to-rose-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg transition-transform duration-150 group-hover:scale-105">
            <Crown className="w-3 h-3" />
            Host
          </div>
          <div className="pointer-events-none absolute -top-12 right-0 w-32 rounded-xl bg-stone-900/90 dark:bg-stone-800/90 px-2 py-1 text-[10px] text-center text-white opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
            This participant controls the room
          </div>
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${isLocallyMuted ? "Unmute" : "Mute"} ${displayName} for yourself`}
        aria-pressed={isLocallyMuted}
        title={`${isLocallyMuted ? "Unmute" : "Mute"} ${displayName} for yourself`}
        onClick={() => setIsLocallyMuted((muted) => !muted)}
        className="absolute right-3 top-3 z-10 size-10 rounded-full bg-stone-900/80 text-white shadow-lg backdrop-blur-sm hover:bg-stone-800 focus-visible:ring-white"
      >
        {isLocallyMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!videoEnabled}
        aria-label={`${isVideoHiddenForMe ? "Show" : "Hide"} ${displayName}'s video for yourself`}
        aria-pressed={isVideoHiddenForMe}
        title={`${isVideoHiddenForMe ? "Show" : "Hide"} ${displayName}'s video for yourself`}
        onClick={() => setIsVideoHiddenForMe((hidden) => !hidden)}
        className="absolute right-3 top-14 z-10 size-10 rounded-full bg-stone-900/80 text-white shadow-lg backdrop-blur-sm hover:bg-stone-800 focus-visible:ring-white"
      >
        {isVideoHiddenForMe ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
      <div
        className={`absolute top-3 left-3 flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white transition-all duration-150 ${
          audioEnabled ? "opacity-100" : "opacity-30"
        }`}
        style={{
          backgroundColor: isSpeaking ? "rgba(251,191,36,0.9)" : "rgba(0,0,0,0.45)",
          color: isSpeaking ? "#451a03" : undefined,
        }}
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20"
          style={{
            transform: `scale(${0.9 + normalizedLevel * 0.4})`,
            transition: "transform 120ms ease-out",
          }}
        >
          <Waves
            className="h-3 w-3"
            style={{ opacity: 0.6 + normalizedLevel * 0.4 }}
          />
        </span>
        {connectionPhase === "connected" || connectionPhase === undefined
          ? isSpeaking ? "Speaking" : "Live"
          : connectionPhase === "failed" ? "Unavailable" : "Connecting"}
      </div>
      {(!videoEnabled || isVideoHiddenForMe) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-800/80 text-white">
          {videoEnabled ? <EyeOff className="w-10 h-10" /> : <VideoOff className="w-10 h-10" />}
          <span className="text-sm font-semibold">{videoEnabled ? "Video hidden for you" : "Video unavailable"}</span>
        </div>
      )}
      {!audioEnabled && (
        <div className="absolute right-3 top-28 rounded-full bg-stone-900/80 p-2 text-white" title="Their microphone is muted">
          <MicOff className="w-4 h-4" />
        </div>
      )}
      {connectionInterrupted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950/90 p-6 text-center text-white" role="status" aria-live="polite">
          <div className={`mb-3 grid h-12 w-12 place-items-center rounded-full ${connectionPhase === "failed" ? "bg-rose-500/20 text-rose-200" : "bg-amber-400/20 text-amber-100"}`}>
            {connectionPhase === "failed" ? <VideoOff aria-hidden="true" className="h-6 w-6" /> : <Waves aria-hidden="true" className="h-6 w-6 animate-pulse motion-reduce:animate-none" />}
          </div>
          <p className="font-semibold">{connectionPhase === "failed" ? "Call unavailable" : "Reconnecting"}</p>
          <p className="mt-1 max-w-sm text-sm text-stone-200">{connectionIssue ?? (connectionPhase === "failed" ? "This participant is still in the room, but the media connection failed." : "The network connection was interrupted. Trying to restore it…")}</p>
        </div>
      )}
    </div>
  );
};

export default RemoteVideoTile;
