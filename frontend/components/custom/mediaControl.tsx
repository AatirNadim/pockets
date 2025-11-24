import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useUserStore } from "../../lib/stores/userStore";
import { useChatStore } from "@/lib/stores/chatStore";
import { useMediaStore } from "@/lib/hooks/mediaHook";

const MediaControl = () => {
  const { leaveRoom } = useUserStore();
  const { isVideoOff, isSpeakerOff, toggleSpeakerOff, toggleVideoOff } =
    useMediaStore();
  const { showChat, toggleShowChat } = useChatStore();
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white/80 text-slate-700 backdrop-blur-md border-t border-slate-200 dark:bg-black/40 dark:text-white dark:border-white/10">
      <div className="flex items-center justify-center space-x-4 p-6">
        <Button
          onClick={() => {
            setIsMuted((prev) => !prev);
          }}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-full transition-all duration-200 ${
            isMuted
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 dark:hover:text-white"
          }`}
        >
          {isMuted ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>

        <Button
          onClick={toggleVideoOff}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-full transition-all duration-200 ${
            isVideoOff
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 dark:hover:text-white"
          }`}
        >
          {isVideoOff ? (
            <VideoOff className="w-5 h-5" />
          ) : (
            <Video className="w-5 h-5" />
          )}
        </Button>

        <Button
          onClick={toggleSpeakerOff}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-full transition-all duration-200 ${
            isSpeakerOff
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 dark:hover:text-white"
          }`}
        >
          {isSpeakerOff ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        <Button
          onClick={toggleShowChat}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-full transition-all duration-200 ${
            showChat
              ? "bg-[#635bff] hover:bg-[#544dc9] text-white"
              : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 dark:hover:text-white"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="w-12 h-12 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 transition-all duration-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 dark:hover:text-white"
        >
          <Settings className="w-5 h-5" />
        </Button>

        <div className="w-px h-8 bg-slate-300 dark:bg-white/20 mx-2"></div>

        <Button
          onClick={leaveRoom}
          variant="ghost"
          size="lg"
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 transform hover:scale-105"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default MediaControl;
