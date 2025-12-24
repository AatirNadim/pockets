import React from "react";
import { Button } from "../ui/button";
import {
  Camera,
  Check,
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
import { useChatStore } from "@/lib/stores/chatStore";
import { useMediaStore } from "@/lib/stores/mediaStore";
import type { MediaDeviceOption } from "@/lib/stores/mediaStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type DeviceDropdownProps = {
  label: string;
  icon: React.ReactNode;
  devices: MediaDeviceOption[];
  selectedId: string | null;
  onSelect: (deviceId: string) => void | Promise<void>;
};

const DeviceDropdown = ({
  label,
  icon,
  devices,
  selectedId,
  onSelect,
}: DeviceDropdownProps) => {
  const activeLabel = devices.find(
    (device) => device.deviceId === selectedId
  )?.label;
  const isDisabled = devices.length === 0;

  const handleSelect = (deviceId: string) => {
    return Promise.resolve(onSelect(deviceId));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className={cn(
            "min-w-40 justify-between rounded-2xl px-4 text-sm font-medium",
            isDisabled
              ? "cursor-not-allowed bg-stone-200 text-stone-500 opacity-50 dark:bg-stone-800 dark:text-stone-500"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-white"
          )}
          disabled={isDisabled}
        >
          <span className="flex items-center gap-2">
            {icon}
            {activeLabel || `Select ${label}`}
          </span>
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side="top"
        sideOffset={12}
        className="w-64 rounded-2xl border-stone-200/50 dark:border-stone-700/50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="text-xs tracking-wide uppercase text-stone-500 dark:text-stone-400">
          {label}
        </DropdownMenuLabel>
        <div className="max-h-56 overflow-y-auto">
          {devices.length ? (
            devices.map((device) => (
              <DropdownMenuItem
                key={device.deviceId}
                onSelect={() => {
                  handleSelect(device.deviceId);
                }}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl",
                  selectedId === device.deviceId && "text-amber-600 dark:text-amber-400"
                )}
              >
                <span className="truncate text-sm">{device.label}</span>
                {selectedId === device.deviceId && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-3 text-sm text-stone-500 dark:text-stone-400">
              No devices detected
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type MediaControlProps = {
  cameras: MediaDeviceOption[];
  microphones: MediaDeviceOption[];
  selectedCameraId: string | null;
  selectedMicrophoneId: string | null;
  onCameraChange: (deviceId: string) => void | Promise<void>;
  onMicrophoneChange: (deviceId: string) => void | Promise<void>;
  onToggleMute: (nextMuted: boolean) => Promise<void>;
  onToggleVideo: (disabled: boolean) => Promise<void>;
  onLeave: () => void;
};

const MediaControl = ({
  cameras,
  microphones,
  selectedCameraId,
  selectedMicrophoneId,
  onCameraChange,
  onMicrophoneChange,
  onToggleMute,
  onToggleVideo,
  onLeave,
}: MediaControlProps) => {
  const { isVideoOff, isSpeakerOff, isMicrophoneMuted, toggleSpeakerOff } =
    useMediaStore();
  const { showChat, toggleShowChat } = useChatStore();

  return (
    <div className="w-full glass border-t border-stone-200/50 dark:border-stone-700/50">
      <div className="flex flex-wrap items-center justify-center gap-4 p-6">
        <Button
          onClick={() => {
            onToggleMute(!isMicrophoneMuted).then(() => {
              console.log("toggle mute complete");
            });
          }}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-2xl transition-all duration-200 ${
            isMicrophoneMuted
              ? "bg-rose-500 hover:bg-rose-600 text-white"
              : "bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:hover:text-white"
          }`}
        >
          {isMicrophoneMuted ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>

        <Button
          onClick={() => {
            onToggleVideo(!isVideoOff).then(() => {
              console.log("toggle video complete");
            });
          }}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-2xl transition-all duration-200 ${
            isVideoOff
              ? "bg-rose-500 hover:bg-rose-600 text-white"
              : "bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:hover:text-white"
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
          className={`w-12 h-12 rounded-2xl transition-all duration-200 ${
            isSpeakerOff
              ? "bg-rose-500 hover:bg-rose-600 text-white"
              : "bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:hover:text-white"
          }`}
        >
          {isSpeakerOff ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        <DeviceDropdown
          label="Camera"
          icon={<Camera className="w-4 h-4" />}
          devices={cameras}
          selectedId={selectedCameraId}
          onSelect={onCameraChange}
        />

        <DeviceDropdown
          label="Microphone"
          icon={<Mic className="w-4 h-4" />}
          devices={microphones}
          selectedId={selectedMicrophoneId}
          onSelect={onMicrophoneChange}
        />

        <Button
          onClick={toggleShowChat}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-2xl transition-all duration-200 ${
            showChat
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:hover:text-white"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="w-12 h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 transition-all duration-200 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:hover:text-white"
        >
          <Settings className="w-5 h-5" />
        </Button>

        <div className="w-px h-8 bg-stone-300 dark:bg-stone-600 mx-2"></div>

        <Button
          onClick={onLeave}
          variant="ghost"
          size="lg"
          className="w-12 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white transition-all duration-200 transform hover:scale-105"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default MediaControl;
