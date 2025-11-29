import { MicOff, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";

type RemoteVideoTileProps = {
  stream: MediaStream;
  userName?: string;
  userId: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
};

const RemoteVideoTile = ({
  stream,
  userName,
  userId,
  videoEnabled,
  audioEnabled,
}: RemoteVideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    if (videoEnabled && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      return;
    }

    videoRef.current.srcObject = null;
  }, [stream, videoEnabled]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    if (!videoEnabled && audioEnabled && stream) {
      if (audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
      }

      void audioRef.current.play().catch(() => undefined);
      return;
    }

    audioRef.current.pause();
    audioRef.current.srcObject = null;
  }, [stream, videoEnabled, audioEnabled]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200/60 bg-black/60 shadow-xl dark:border-white/10">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover ${
          videoEnabled ? "opacity-100" : "opacity-0"
        }`}
      />
      <audio ref={audioRef} autoPlay className="hidden" />
      <div className="absolute bottom-3 left-3 bg-black/70 text-white text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm">
        {userName || `Participant ${userId.slice(0, 4)}`}
      </div>
      {!videoEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
          <VideoOff className="w-10 h-10" />
          <span className="text-sm font-semibold">Video unavailable</span>
        </div>
      )}
      {!audioEnabled && (
        <div className="absolute top-3 right-3 rounded-full bg-black/70 p-2 text-white">
          <MicOff className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default RemoteVideoTile;